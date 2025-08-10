from flask import request
from flask_restx import Resource, fields
from app import app, db, api, collaborationNameSpace
from models import Collaboration

# Swagger model
CollaborationModel = collaborationNameSpace.model('Collaboration', {
    'id': fields.Integer(readonly=True, description='The collaboration unique identifier'),
    'userId': fields.Integer(required=True, description='The user ID'),
    'userFullName': fields.String(required=False, description='The user full name'),
    'vaultId': fields.Integer(description='Vault ID'),
    'folderId': fields.Integer(description='Folder ID'),
    'workspaceId': fields.Integer(description='Workspace ID'),
    'fileId': fields.Integer(description='File ID'),
    'permissionType':fields.String(description='permission type')
})

# Filter parser
collaborationFilterParams = collaborationNameSpace.parser()
collaborationFilterParams.add_argument('userId', type=int, required=False)
collaborationFilterParams.add_argument('vaultId', type=int, required=False)
collaborationFilterParams.add_argument('folderId', type=int, required=False)
collaborationFilterParams.add_argument('workspaceId', type=int, required=False)
collaborationFilterParams.add_argument('fileId', type=int, required=False)

@collaborationNameSpace.route('/')
class Collaborations(Resource):
    @collaborationNameSpace.doc('ListCollaboration')
    @collaborationNameSpace.expect(collaborationFilterParams)
    @collaborationNameSpace.marshal_list_with(CollaborationModel)
    def get(self):
        """List collaborations with filters"""
        args = collaborationFilterParams.parse_args()
        query = Collaboration.query

        for field in ['userId', 'vaultId', 'folderId', 'workspaceId', 'fileId']:
            value = args.get(field)
            if value is not None:
                query = query.filter(getattr(Collaboration, field[0].upper() + field[1:]) == value)

        return [collaboration.serialize() for collaboration in query.all()]

    @collaborationNameSpace.doc('CreateCollaboration')
    @collaborationNameSpace.expect(CollaborationModel)
    @collaborationNameSpace.marshal_with(CollaborationModel, code=201)
    def post(self):
        """Create a new collaboration (exactly one resource type should be used)"""
        data = request.json

        # Normalize 0 → None
        vault_id = data.get('vaultId') or None if data.get('vaultId') != 0 else None
        folder_id = data.get('folderId') or None if data.get('folderId') != 0 else None
        workspace_id = data.get('workspaceId') or None if data.get('workspaceId') != 0 else None
        file_id = data.get('fileId') or None if data.get('fileId') != 0 else None
        permission_type = data.get('permissionType') or None if data.get('permissionType') != 0 else None
        resource_ids = {
            "vaultId": vault_id,
            "folderId": folder_id,
            "workspaceId": workspace_id,
            "fileId": file_id
        }

        # Count how many are set
        non_null = {k: v for k, v in resource_ids.items() if v is not None}
        if len(non_null) != 1:
            return {
                "message": "Exactly one of vaultId, folderId, workspaceId, or fileId must be non-zero.",
                "provided": resource_ids
            }, 400

        collab = Collaboration(
            UserId=data.get('userId'),
            VaultId=vault_id,
            FolderId=folder_id,
            WorkspaceId=workspace_id,
            FileId=file_id,
            PermissionType=permission_type
        )

        db.session.add(collab)
        db.session.commit()
        return collab.serialize(), 201

@collaborationNameSpace.route('/<int:id>')
class CollaborationResource(Resource):
    @collaborationNameSpace.doc('DeleteCollaboration')
    @collaborationNameSpace.response(204, 'Collaboration deleted')
    def delete(self, id):
        collaboration = Collaboration.query.get_or_404(id)
        db.session.delete(collaboration)
        db.session.commit()
        return '', 204

# Register
collaborationNameSpace.add_resource(Collaborations, '/')
collaborationNameSpace.add_resource(CollaborationResource, '/<int:id>')
api.add_namespace(collaborationNameSpace)

if __name__ == '__main__':
    app.run(debug=True)
