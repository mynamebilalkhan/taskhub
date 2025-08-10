from datetime import datetime
from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields
from sqlalchemy import null
from app import app, db, api, folderNameSpace
from models import Folder, User


FolderModel = folderNameSpace.model('Folder', {
    'id': fields.Integer(readOnly=True, description='The folder unique identifier'),
    'name': fields.String(required=True, description='The folder title'),
    'createdBy': fields.Integer(description='The folder created by id'),
    'parentId': fields.Integer(description='The parent folder identifier'),
    'parentName': fields.String(description='The parent folder Title'),
    'createdDateTime': fields.DateTime(description='The folder created date time'),
    'createdByUser': fields.String(required=True, description='The user that create by user'),
    'vaultId': fields.String(required=True, description='The valut identifier') 
})
folderFilterParams = folderNameSpace.parser()
folderFilterParams.add_argument('vaultId', type=int, required=False, help='The ID of the vault to filter by')

# Resource for managing folders
@folderNameSpace.route('/')
class Folders(Resource):
    @folderNameSpace.doc('ListFolders')
    @folderNameSpace.expect(folderFilterParams)
    @folderNameSpace.marshal_list_with(FolderModel)
    def get(self):
        """List all folders"""
        vaultId = request.args.get('vaultId')
        query = Folder.query
        if vaultId:
            query = query.filter_by(VaultId=vaultId)

        folders = query.all()
        return [folder.serialize() for folder in folders]

    @folderNameSpace.doc('CreateFolder')
    @folderNameSpace.expect(FolderModel)
    @folderNameSpace.marshal_with(FolderModel, code=201)
    def post(self):
        """Create a new folder"""
        data = request.json
        parentId = data.get('parentId')
        if parentId == 0 :
            parentId = None
        newFolder = Folder(
            Name=data['name'],
            CreatedBy=data.get('createdBy'),
            ParentId=parentId, 
            CreatedDateTime=datetime.now(),
            VaultId = data.get('vaultId')
        )
        db.session.add(newFolder)
        db.session.commit()
        return newFolder.serialize(), 201
# add endpoint to get all folder by companyId
@folderNameSpace.route('/<int:id>')
@folderNameSpace.response(404, 'Folder not found')
@folderNameSpace.param('id', 'The folder identifier')
class FolderResource(Resource):
    @folderNameSpace.doc('GetFolder')
    @folderNameSpace.marshal_with(FolderModel)
    def get(self, id):
        """Fetch a folder given its identifier"""
        folder = Folder.query.get_or_404(id)
        return folder.serialize()

    @folderNameSpace.doc('UpdateFolder')
    @folderNameSpace.expect(FolderModel)
    @folderNameSpace.marshal_with(FolderModel)
    def put(self, id):
        """Update a folder given its identifier"""
        folder = Folder.query.get_or_404(id)
        data = request.json
        parentId = data.get('parentId')
        if parentId == 0 :
            parentId = None
        folder.Name = data.get('name', folder.Name)
        folder.ParentId = parentId
        folder.CreatedBy = data.get('createdBy', folder.CreatedBy)
        db.session.commit()
        return folder.serialize()

    @folderNameSpace.doc('DeleteFolder')
    @folderNameSpace.response(204, 'Folder deleted')
    def delete(self, id):
        """Delete a folder given its identifier"""
        folder = Folder.query.get_or_404(id)
        db.session.delete(folder)
        db.session.commit()
        return '', 204
@folderNameSpace.route('/Company/<int:companyId>')
@folderNameSpace.response(404, 'No folders found for this company')
@folderNameSpace.param('companyId', 'The company identifier')
class FoldersByCompany(Resource):
    @folderNameSpace.doc('GetFoldersByCompany')
    @folderNameSpace.marshal_list_with(FolderModel)
    def get(self, companyId):
        """List all folders filtered by company ID"""
        folders = Folder.query.join(User, Folder.CreatedBy == User.Id).filter(User.CompanyId == companyId).all()
        if not folders:
            folderNameSpace.abort(404, "No folders found for this company")
        return [folder.serialize() for folder in folders]

# Add resources to namespace
folderNameSpace.add_resource(Folders, '/')
folderNameSpace.add_resource(FolderResource, '/<int:id>')
folderNameSpace.add_resource(FoldersByCompany, '/Company/<int:companyId>')
api.add_namespace(folderNameSpace)
if __name__ == '__main__':
    app.run(debug=True)
