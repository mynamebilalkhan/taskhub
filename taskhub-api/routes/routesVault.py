from datetime import datetime
from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields
from sqlalchemy import null, or_
from app import app, db, api, vaultNameSpace
from models import Vault, User, Folder, Collaboration, File, Url, Workspace, Page, Task, TextBox, Card, CardConnection, Image, FavoriteTasks, PinnedTasks
from sqlalchemy import and_


VaultModel = vaultNameSpace.model('Vault', {
    'id': fields.Integer(readOnly=True, description='The vault unique identifier'),
    'name': fields.String(required=True, description='The vault title'),
    'createdBy': fields.Integer(description='The vault created by id'),
    'createdDateTime': fields.DateTime(description='The vault created date time'),
    'createdByName': fields.String(description='The user that create by user'),
    'numOfUsers': fields.Integer(description='The vault usersNum'),
})

def delete_tasks_by_vault_id(vault_id):
    """Delete all tasks that belong to a vault and their related data"""
    try:
        # Find all tasks that belong to this vault through the hierarchy:
        # Task -> Page -> Workspace -> Folder -> Vault
        tasks_query = db.session.query(Task).join(
            Page, Task.PageId == Page.Id
        ).join(
            Workspace, Page.WorkspaceId == Workspace.Id
        ).join(
            Folder, Workspace.FolderId == Folder.Id
        ).filter(
            Folder.VaultId == vault_id
        )
        
        tasks = tasks_query.all()
        task_ids = [task.Id for task in tasks]
        task_count = len(tasks)
        
        print(f"Found {task_count} tasks to delete for vault {vault_id}")
        if task_ids:
            print(f"Task IDs to delete: {task_ids}")
        
        # Delete all tasks at once with their references  
        if task_ids:
            # Delete favorite tasks references
            deleted_fav = FavoriteTasks.query.filter(FavoriteTasks.TaskId.in_(task_ids)).delete(synchronize_session=False)
            print(f"Deleted {deleted_fav} favorite task references")
            
            # Delete pinned tasks references
            deleted_pinned = PinnedTasks.query.filter(PinnedTasks.TaskId.in_(task_ids)).delete(synchronize_session=False)
            print(f"Deleted {deleted_pinned} pinned task references")
            
            # Find and delete child tasks (tasks that have any of our tasks as parent)
            child_tasks = Task.query.filter(Task.ParentId.in_(task_ids)).all()
            child_task_ids = [child.Id for child in child_tasks]
            
            if child_task_ids:
                print(f"Found {len(child_task_ids)} child tasks to delete")
                # Delete child task references
                FavoriteTasks.query.filter(FavoriteTasks.TaskId.in_(child_task_ids)).delete(synchronize_session=False)
                PinnedTasks.query.filter(PinnedTasks.TaskId.in_(child_task_ids)).delete(synchronize_session=False)
                
                # Delete child tasks
                Task.query.filter(Task.Id.in_(child_task_ids)).delete(synchronize_session=False)
            
            # Delete the main tasks
            deleted_tasks = Task.query.filter(Task.Id.in_(task_ids)).delete(synchronize_session=False)
            print(f"Deleted {deleted_tasks} main tasks")
        
        print(f"Successfully deleted {task_count} tasks and their references for vault {vault_id}")
        return task_count
        
    except Exception as e:
        print(f"Error deleting tasks for vault {vault_id}: {str(e)}")
        raise e

def test_task_fetch_for_vault(vault_id):
    """Test function to verify task fetching works after vault operations"""
    try:
        # Query all tasks that should belong to this vault
        tasks_query = db.session.query(Task).join(
            Page, Task.PageId == Page.Id
        ).join(
            Workspace, Page.WorkspaceId == Workspace.Id
        ).join(
            Folder, Workspace.FolderId == Folder.Id
        ).filter(
            Folder.VaultId == vault_id
        )
        
        tasks = tasks_query.all()
        print(f"Test: Found {len(tasks)} tasks for vault {vault_id}")
        
        for task in tasks:
            print(f"  Task: {task.Id} - {task.Title} (Page: {task.Page.Name})")
        
        return len(tasks)
        
    except Exception as e:
        print(f"Error testing task fetch for vault {vault_id}: {str(e)}")
        return -1

# Resource for managing vaults
vaultFilterParams = vaultNameSpace.parser()
vaultFilterParams.add_argument('userId', type=int, required=False, help='user Id to filter by')

@vaultNameSpace.route('/')
class Vaults(Resource):
    @vaultNameSpace.doc('ListVaults')
    @vaultNameSpace.marshal_list_with(VaultModel)
    def get(self):
        """List all vaults"""
        query = Vault.query
        userId = request.args.get('userId')
        if userId is not None:
            subq = db.session.query(Collaboration.VaultId).filter_by(UserId=userId)
            query = query.filter(
                or_(
                    Vault.CreatedBy == userId,
                    Vault.Id.in_(subq)
                )
            )
        vaults = query.all()
        return [vault.serialize() for vault in vaults]

    @vaultNameSpace.doc('CreateVault')
    @vaultNameSpace.expect(VaultModel)
    @vaultNameSpace.marshal_with(VaultModel, code=201)
    def post(self):
        """Create a new vault"""
        data = request.json
        newVault = Vault(
            Name=data['name'],
            CreatedBy=data.get('createdBy'),
            CreatedDateTime=datetime.now()
        )
        db.session.add(newVault)
        db.session.commit()
        newFolder = Folder(
            Name ="Documents",
            VaultId = newVault.Id, 
            CreatedBy=data.get('createdBy'),
            CreatedDateTime=datetime.now()
        )
        db.session.add(newFolder)
        db.session.commit()
        return newVault.serialize(), 201
# add endpoint to get all vault by companyId
@vaultNameSpace.route('/<int:id>')
@vaultNameSpace.response(404, 'Vault not found')
@vaultNameSpace.param('id', 'The vault identifier')
class VaultResource(Resource):
    @vaultNameSpace.doc('GetVault')
    @vaultNameSpace.marshal_with(VaultModel)
    def get(self, id):
        """Fetch a vault given its identifier"""
        vault = Vault.query.get_or_404(id)
        return vault.serialize()

    @vaultNameSpace.doc('UpdateVault')
    @vaultNameSpace.expect(VaultModel)
    @vaultNameSpace.marshal_with(VaultModel)
    def put(self, id):
        """Update a vault given its identifier"""
        vault = Vault.query.get_or_404(id)
        data = request.json
        vault.Name = data.get('name', vault.Name)
        vault.CreatedBy = data.get('createdBy', vault.CreatedBy)
        db.session.commit()
        return vault.serialize()

    @vaultNameSpace.doc('DeleteVault')
    @vaultNameSpace.response(204, 'Vault deleted')
    def delete(self, id):
        """Delete a vault and all its related data"""
        try:
            vault = Vault.query.get_or_404(id)
            
            # Delete all tasks belonging to this vault using our helper function
            task_count = delete_tasks_by_vault_id(id)
            print(f"Vault {id}: Deleted {task_count} tasks")
            
            # Flush the session to ensure task deletions are committed before other operations
            db.session.flush()
            
            # Handle other related data
            # 1. Delete all collaborations for this vault
            collaborations = Collaboration.query.filter_by(VaultId=id).all()
            for collaboration in collaborations:
                db.session.delete(collaboration)
            
            # 2. Handle folders and their nested data (cascade deletion)
            folders = Folder.query.filter_by(VaultId=id).all()
            for folder in folders:
                # First handle workspaces and all their contents
                workspaces = Workspace.query.filter_by(FolderId=folder.Id).all()
                for workspace in workspaces:
                    # Get all pages in this workspace
                    pages = Page.query.filter_by(WorkspaceId=workspace.Id).all()
                    for page in pages:
                        # Tasks already deleted by helper function above
                        
                        # Delete all textboxes (task notes) in this page
                        textboxes = TextBox.query.filter_by(PageId=page.Id).all()
                        for textbox in textboxes:
                            db.session.delete(textbox)
                        
                        # Delete all cards in this page
                        cards = Card.query.filter_by(PageId=page.Id).all()
                        for card in cards:
                            # Delete card connections
                            from_connections = CardConnection.query.filter_by(FromCardId=card.Id).all()
                            to_connections = CardConnection.query.filter_by(ToCardId=card.Id).all()
                            for connection in from_connections + to_connections:
                                db.session.delete(connection)
                            
                            # Delete the card
                            db.session.delete(card)
                        
                        # Delete all images in this page
                        images = Image.query.filter_by(PageId=page.Id).all()
                        for image in images:
                            db.session.delete(image)
                        
                        # Delete the page
                        db.session.delete(page)
                    
                    # Delete the workspace
                    db.session.delete(workspace)
                
                # Delete files in this folder
                files = File.query.filter_by(FolderId=folder.Id).all()
                for file in files:
                    db.session.delete(file)
                
                # Delete URLs in this folder  
                urls = Url.query.filter_by(FolderId=folder.Id).all()
                for url in urls:
                    db.session.delete(url)
                
                # Delete the folder itself
                db.session.delete(folder)
            
            # 3. Now delete the vault
            db.session.delete(vault)
            db.session.commit()
            return '', 204
            
        except Exception as e:
            db.session.rollback()
            # Log the error for debugging
            print(f"Error deleting vault {id}: {str(e)}")
            return {'error': f'Failed to delete vault: {str(e)}'}, 500
@vaultNameSpace.route('/Company/<int:companyId>')
@vaultNameSpace.response(404, 'No vaults found for this company')
@vaultNameSpace.param('companyId', 'The company identifier')
class VaultsByCompany(Resource):
    @vaultNameSpace.doc('GetVaultsByCompany')
    @vaultNameSpace.marshal_list_with(VaultModel)
    def get(self, companyId):
        """List all vaults filtered by company ID"""
        vaults = Vault.query.join(User, Vault.CreatedBy == User.Id).filter(User.CompanyId == companyId).all()
        if not vaults:
            vaultNameSpace.abort(404, "No vaults found for this company")
        return [vault.serialize() for vault in vaults]

@vaultNameSpace.route('/<int:id>/test-tasks')
@vaultNameSpace.param('id', 'The vault identifier')
class VaultTaskTest(Resource):
    @vaultNameSpace.doc('TestVaultTasks')
    def get(self, id):
        """Test task fetching for a vault - useful for debugging"""
        try:
            task_count = test_task_fetch_for_vault(id)
            return {
                'vaultId': id,
                'taskCount': task_count,
                'status': 'success' if task_count >= 0 else 'error'
            }
        except Exception as e:
            return {
                'vaultId': id,
                'error': str(e),
                'status': 'error'
            }, 500

# Add resources to namespace
vaultNameSpace.add_resource(Vaults, '/')
vaultNameSpace.add_resource(VaultResource, '/<int:id>')
vaultNameSpace.add_resource(VaultsByCompany, '/Company/<int:companyId>')
vaultNameSpace.add_resource(VaultTaskTest, '/<int:id>/test-tasks')
api.add_namespace(vaultNameSpace)
if __name__ == '__main__':
    app.run(debug=True)
