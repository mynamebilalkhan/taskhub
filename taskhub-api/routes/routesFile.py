from datetime import datetime
from flask import  request, jsonify
from flask_restx import Resource, fields
from app import app, db, api, fileNameSpace
from models import File, User

FileModel = fileNameSpace.model('File', {
    'id': fields.Integer(readOnly=True, description='The file unique identifier'),
    'name': fields.String(required=True, description='The file name'),
    'path': fields.String(required=True, description='The file path'),
    'folderId': fields.Integer(description='The folder identifier'),
    'createdBy': fields.Integer(description='The created by user identifier'),
    'createdDateTime': fields.DateTime(description='The created date time'),
    'createdByUser': fields.String(description='The user who create file'),
    'iso365File': fields.Boolean( description='The flag for o365 files')
})


fileFilterParams = fileNameSpace.parser()
fileFilterParams.add_argument('folderId', type=int, required=False, help='The Folder id to search for')
@fileNameSpace.route('/')
class Files(Resource):
    @fileNameSpace.doc('ListFiles')
    @fileNameSpace.expect(fileFilterParams)
    @fileNameSpace.marshal_list_with(FileModel)
    def get(self):
        """List all files"""
        folderId = request.args.get('folderId')

        query = File.query
        if folderId:
            query = query.filter_by(FolderId=folderId)

        files = query.all()
        return [file.serialize() for file in files]
    
    @fileNameSpace.doc('CreateFile')
    @fileNameSpace.expect(FileModel)
    @fileNameSpace.marshal_with(FileModel, code=201)
    def post(self):
        """Create a new file"""
        data = request.json
        folderId = data.get('folderId')
        if folderId == 0 :
            folderId = None
        isO365 = data.get('iso365File')
        if isO365 is None :
            isO365 = False
        newFile = File(
            Name=data['name'],
            Path=data['path'],
            FolderId=folderId,
            CreatedBy=data.get('createdBy'),
            CreatedDateTime=datetime.now(),
            Iso265File=isO365
        )
        db.session.add(newFile)
        db.session.commit()
        return newFile.serialize(), 201

@fileNameSpace.route('/<int:id>')
@fileNameSpace.response(404, 'File not found')
@fileNameSpace.param('id', 'The file identifier')
class FileResource(Resource):
    @fileNameSpace.doc('GetFile')
    @fileNameSpace.marshal_with(FileModel)
    def get(self, id):
        """Fetch a file given its identifier"""
        file = File.query.get_or_404(id)
        return file.serialize()

    @fileNameSpace.doc('UpdateFile')
    @fileNameSpace.expect(FileModel)
    @fileNameSpace.marshal_with(FileModel)
    def put(self, id):
        """Update a file given its identifier"""
        file = File.query.get_or_404(id)
        data = request.json
        folderId = data.get('folderId')
        if folderId == 0 :
            folderId = None
        
        file.Name = data.get('name')
        file.Path = data.get('path')
        file.FolderId = folderId
        file.CreatedBy = data.get('createdBy')
        file.CreatedDateTime = data.get('createdDateTime')
        db.session.commit()
        return file.serialize()

    @fileNameSpace.doc('DeleteFile')
    @fileNameSpace.response(204, 'File deleted')
    def delete(self, id):
        """Delete a file given its identifier"""
        file = File.query.get_or_404(id)
        db.session.delete(file)
        db.session.commit()
        return '', 204
@fileNameSpace.route('/Company/<int:companyId>')
@fileNameSpace.response(404, 'No file found for this company')
@fileNameSpace.param('companyId', 'The file identifier')
class FilesByCompany(Resource):
    @fileNameSpace.doc('GetFilesByCompany')
    @fileNameSpace.marshal_list_with(FileModel)
    def get(self, companyId):
        """List all files filtered by company ID"""
        files = File.query.join(User, File.CreatedBy == User.Id).filter(User.CompanyId == companyId).all()
        if not files:
            fileNameSpace.abort(404, "No files found for this company")
        return [file.serialize() for file in files]
    
fileNameSpace.add_resource(Files, '/')
fileNameSpace.add_resource(FileResource, '/<int:id>')
fileNameSpace.add_resource(FilesByCompany, '/Company/<int:companyId>')

api.add_namespace(fileNameSpace)
if __name__ == '__main__':
    app.run(debug=True)