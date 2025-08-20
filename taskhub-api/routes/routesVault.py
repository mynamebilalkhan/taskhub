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

# Helper functions removed - cascade deletion is now handled in the main delete method

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
    @vaultNameSpace.response(204, 'Vault deleted successfully')
    @vaultNameSpace.response(404, 'Vault not found')
    @vaultNameSpace.response(500, 'Internal server error during deletion')
    def delete(self, id):
        """Delete a vault and all its related data"""
        try:
            # Get the vault
            vault = Vault.query.get(id)
            if not vault:
                return {'message': 'Vault not found'}, 404

            # Clear CreatedFromTaskId and CreatedFromCardId references in Workspaces
            # to prevent foreign key constraint violations
            workspaces_in_vault = db.session.query(Workspace).join(Folder).filter(Folder.VaultId == id).all()
            for workspace in workspaces_in_vault:
                workspace.CreatedFromTaskId = None
                workspace.CreatedFromCardId = None

            # Delete FavoriteTasks and PinnedTasks associated with tasks in this vault
            tasks_in_vault = db.session.query(Task).join(Page).join(Workspace).join(Folder).filter(Folder.VaultId == id).all()
            for task in tasks_in_vault:
                # Delete FavoriteTasks
                FavoriteTasks.query.filter_by(TaskId=task.Id).delete()
                # Delete PinnedTasks
                PinnedTasks.query.filter_by(TaskId=task.Id).delete()

            # Delete CardConnections associated with cards in this vault
            cards_in_vault = db.session.query(Card).join(Page).join(Workspace).join(Folder).filter(Folder.VaultId == id).all()
            for card in cards_in_vault:
                # Delete connections where this card is the source or target
                CardConnection.query.filter(
                    (CardConnection.FromCardId == card.Id) | 
                    (CardConnection.ToCardId == card.Id)
                ).delete(synchronize_session=False)

            # Delete files that reference pages in this vault
            # First get all page IDs in this vault
            page_ids = [page.Id for page in db.session.query(Page).join(Workspace).join(Folder).filter(Folder.VaultId == id).all()]
            app.logger.info(f"Found {len(page_ids)} pages in vault {id}: {page_ids}")
            
            # Delete all files that reference any of these pages - delete individually to ensure proper removal
            if page_ids:
                files_to_delete = File.query.filter(File.PageId.in_(page_ids)).all()
                app.logger.info(f"Found {len(files_to_delete)} files to delete referencing pages")
                for file in files_to_delete:
                    app.logger.info(f"Deleting file {file.Id} ({file.Name}) referencing PageId {file.PageId}")
                    db.session.delete(file)
            
            # Also delete files that have WorkspaceId in this vault
            workspace_ids = [ws.Id for ws in db.session.query(Workspace).join(Folder).filter(Folder.VaultId == id).all()]
            if workspace_ids:
                workspace_files_to_delete = File.query.filter(File.WorkspaceId.in_(workspace_ids)).all()
                app.logger.info(f"Found {len(workspace_files_to_delete)} files to delete referencing workspaces")
                for file in workspace_files_to_delete:
                    app.logger.info(f"Deleting file {file.Id} ({file.Name}) referencing WorkspaceId {file.WorkspaceId}")
                    db.session.delete(file)
            
            # Commit file deletions to ensure foreign key constraints are satisfied
            db.session.commit()
            app.logger.info(f"Committed file deletions for vault {id}")
            
            # Verify all files are deleted before proceeding
            remaining_files = File.query.filter(File.PageId.in_(page_ids) if page_ids else False).count()
            if remaining_files > 0:
                app.logger.error(f"Still {remaining_files} files referencing pages after deletion attempt")
                raise Exception(f"Failed to delete all files: {remaining_files} files still reference pages in vault")

            # Flush changes before deleting the vault to ensure foreign key references are cleared
            db.session.flush()
            
            # Delete the vault - SQLAlchemy cascade will handle all related entities
            db.session.delete(vault)
            db.session.commit()
            
            return {'message': 'Vault and all related data deleted successfully'}, 200
            
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error deleting vault {id}: {str(e)}")
            return {'message': f'Error deleting vault: {str(e)}'}, 500
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
            # Query all tasks that belong to this vault through the hierarchy
            tasks_query = db.session.query(Task).join(
                Page, Task.PageId == Page.Id
            ).join(
                Workspace, Page.WorkspaceId == Workspace.Id
            ).join(
                Folder, Workspace.FolderId == Folder.Id
            ).filter(
                Folder.VaultId == id
            )
            
            tasks = tasks_query.all()
            task_count = len(tasks)
            
            return {
                'vaultId': id,
                'taskCount': task_count,
                'tasks': [{
                    'id': task.Id,
                    'title': task.Title,
                    'pageId': task.PageId,
                    'pageName': task.Page.Name if task.Page else None
                } for task in tasks[:10]],  # Limit to first 10 for performance
                'status': 'success'
            }
        except Exception as e:
            return {
                'vaultId': id,
                'error': str(e),
                'status': 'error'
            }, 500

# Resources are automatically registered with the namespace via decorators
# The namespace is added to the API in app.py
if __name__ == '__main__':
    app.run(debug=True)
