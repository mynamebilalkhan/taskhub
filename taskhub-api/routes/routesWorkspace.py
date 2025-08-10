from datetime import datetime
from flask import request
from flask_restx import Api, Resource, fields
from sqlalchemy import null
from app import app, db, api, workspaceNameSpace
from models import Workspace, User, Page

WorkspaceModel = workspaceNameSpace.model('Workspace', {
    'id': fields.Integer(readOnly=True, description='The workspace unique identifier'),
    'name': fields.String(required=True, description='The workspace title'),
    'createdBy': fields.Integer(description='The workspace created by id'),
    'createdDateTime': fields.DateTime(description='The workspace created date time'),
    'lastModifyDateTime': fields.DateTime(description='The workspace last modify date time'),
    'createdByUser': fields.String(required=True, description='The user that create by user'),
    'folderId': fields.String(required=True, description='The folder identifier'),
    'createdFromTask': fields.Boolean(description='Whether workspace was created from a task'),
    'createdFromTaskId': fields.Integer(description='ID of the task that created this workspace'),
    'createdFromCardId': fields.Integer(description='ID of the card that created this workspace'),
})

@workspaceNameSpace.route('/')
class Workspaces(Resource):
    @workspaceNameSpace.doc('ListWorkspaces')
    @workspaceNameSpace.marshal_list_with(WorkspaceModel)
    def get(self):
        """List all workspaces"""
        workspaces = Workspace.query.all()
        return [workspace.serialize() for workspace in workspaces]

    @workspaceNameSpace.doc('CreateWorkspace')
    @workspaceNameSpace.expect(WorkspaceModel)
    @workspaceNameSpace.marshal_with(WorkspaceModel, code=201)
    def post(self):
        """Create a new workspace"""
        data = request.json
        folderId = data.get('folderId')
        createdFromTask = True
        if folderId == 0:
            folderId = None
        createdFromTaskId = data.get('createdFromTaskId')
        if createdFromTaskId == 0 or createdFromTaskId is None:
            createdFromTaskId = None
        
        createdFromCardId = data.get('createdFromCardId')
        if createdFromCardId == 0 or createdFromCardId is None:
            createdFromCardId = None
            
        if createdFromCardId is None and  createdFromTaskId is None:
            createdFromTask = False
        
        newWorkspace = Workspace(
            Name=data['name'],
            CreatedBy=data.get('createdBy'),
            FolderId=folderId,
            CreatedDateTime=datetime.now(),
            LastModifyDateTime=datetime.now(),
            CreatedFromTask=createdFromTask,
            CreatedFromTaskId=createdFromTaskId,
            CreatedFromCardId=createdFromCardId
        )
        db.session.add(newWorkspace)
        db.session.commit()
        newPage = Page(
            Name ="New Page",
            WorkspaceId = newWorkspace.Id, 
            CreatedBy=data.get('createdBy'),
            CreatedDateTime=datetime.now(),
            LastModifyDateTime=datetime.now()
        )
        db.session.add(newPage)
        db.session.commit()
        return newWorkspace.serialize(), 201

@workspaceNameSpace.route('/<int:id>')
@workspaceNameSpace.response(404, 'Workspace not found')
@workspaceNameSpace.param('id', 'The workspace identifier')
class WorkspaceResource(Resource):
    @workspaceNameSpace.doc('GetWorkspace')
    @workspaceNameSpace.marshal_with(WorkspaceModel)
    def get(self, id):
        """Fetch a workspace given its identifier"""
        workspace = Workspace.query.get_or_404(id)
        return workspace.serialize()

    @workspaceNameSpace.doc('UpdateWorkspace')
    @workspaceNameSpace.expect(WorkspaceModel)
    @workspaceNameSpace.marshal_with(WorkspaceModel)
    def put(self, id):
        """Update a workspace given its identifier"""
        workspace = Workspace.query.get_or_404(id)
        data = request.json
        folderId = data.get('folderId')
        if folderId == 0:
            folderId = None
        workspace.Name = data.get('name', workspace.Name)
        workspace.FolderId = folderId
        workspace.CreatedBy = data.get('createdBy', workspace.CreatedBy)
        workspace.LastModifyDateTime = datetime.now()
        workspace.CreatedFromTask = data.get('createdFromTask', workspace.CreatedFromTask)
        workspace.CreatedFromTaskId = data.get('createdFromTaskId', workspace.CreatedFromTaskId)
        db.session.commit()
        return workspace.serialize()

    @workspaceNameSpace.doc('DeleteWorkspace')
    @workspaceNameSpace.response(204, 'Workspace deleted')
    def delete(self, id):
        """Delete a workspace given its identifier"""
        workspace = Workspace.query.get_or_404(id)
        db.session.delete(workspace)
        db.session.commit()
        return '', 204

@workspaceNameSpace.route('/Company/<int:companyId>')
@workspaceNameSpace.response(404, 'No workspaces found for this company')
@workspaceNameSpace.param('companyId', 'The company identifier')
class WorkspacesByCompany(Resource):
    @workspaceNameSpace.doc('GetWorkspacesByCompany')
    @workspaceNameSpace.marshal_list_with(WorkspaceModel)
    def get(self, companyId):
        """List all workspaces filtered by company ID"""
        workspaces = Workspace.query.join(User, Workspace.CreatedBy == User.Id).filter(User.CompanyId == companyId).all()
        if not workspaces:
            workspaceNameSpace.abort(404, "No workspaces found for this company")
        return [workspace.serialize() for workspace in workspaces]

@workspaceNameSpace.route('/NotFromTask')
class WorkspacesNotFromTask(Resource):
    @workspaceNameSpace.doc('GetWorkspacesNotCreatedFromTask')
    @workspaceNameSpace.marshal_list_with(WorkspaceModel)
    def get(self):
        """Get all workspaces NOT created from a task"""
        workspaces = Workspace.query.filter(Workspace.CreatedFromTask.is_(False)).all()
        return [ws.serialize() for ws in workspaces]
@workspaceNameSpace.route('/FromTask/<int:task_id>')
@workspaceNameSpace.response(404, 'No workspaces found for this task')
@workspaceNameSpace.param('task_id', 'The task ID')
class WorkspacesFromTask(Resource):
    @workspaceNameSpace.doc('GetWorkspacesCreatedFromSpecificTask')
    @workspaceNameSpace.marshal_with(WorkspaceModel)
    def get(self, task_id):
        """Get all workspaces that were created from a specific task"""
        workspace = Workspace.query.filter(Workspace.CreatedFromTaskId == task_id).first()

        if not workspace:
            workspaceNameSpace.abort(404, "No workspaces found for this task")
        
        return workspace.serialize()

@workspaceNameSpace.route('/FromCard/<int:card_id>')
@workspaceNameSpace.response(404, 'No workspaces found for this card')
@workspaceNameSpace.param('card_id', 'The card ID')
class WorkspacesFromCard(Resource):
    @workspaceNameSpace.doc('GetWorkspacesCreatedFromSpecificCard')
    @workspaceNameSpace.marshal_with(WorkspaceModel)
    def get(self, card_id):
        """Get all workspaces that were created from a specific card"""
        workspace = Workspace.query.filter(Workspace.CreatedFromCardId == card_id).first()

        if not workspace:
            workspaceNameSpace.abort(404, "No workspaces found for this card")
        
        return workspace.serialize()
# Register resources
workspaceNameSpace.add_resource(Workspaces, '/')
workspaceNameSpace.add_resource(WorkspaceResource, '/<int:id>')
workspaceNameSpace.add_resource(WorkspacesByCompany, '/Company/<int:companyId>')
workspaceNameSpace.add_resource(WorkspacesNotFromTask, '/NotFromTask')
workspaceNameSpace.add_resource(WorkspacesFromTask, '/FromTask/<int:task_id>')
workspaceNameSpace.add_resource(WorkspacesFromCard, '/FromCard/<int:card_id>')

api.add_namespace(workspaceNameSpace)

if __name__ == '__main__':
    app.run(debug=True)
