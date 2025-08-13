import os
import base64
from datetime import datetime
from flask import  request, jsonify
from flask_restx import Resource, fields
from app import app, db, api, fileNameSpace
from models import File, User
from werkzeug.utils import secure_filename
import json

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

FileModel = fileNameSpace.model('File', {
    'id': fields.Integer(readOnly=True, description='The file unique identifier'),
    'name': fields.String(required=True, description='The file name'),
    'path': fields.String(required=True, description='The file path'),
    'folderId': fields.Integer(description='The folder identifier'),
    'pageId': fields.Integer(description='The page identifier'),
    'workspaceId': fields.Integer(description='The workspace identifier'),
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

        query = File.query.options(db.joinedload(File.CreatedByUser))
        if folderId:
            query = query.filter_by(FolderId=folderId)

        files = query.all()
        return [file.serialize() for file in files]
    
    @fileNameSpace.doc('CreateFile')
    #@fileNameSpace.expect(FileModel)
    #@fileNameSpace.marshal_with(FileModel, code=201)
    def post(self):
        """Create a new file"""
        try:
            if 'file' not in request.files:
                return jsonify({'message': 'No file part'}), 400

            # Get file from request
            file = request.files['file']
            if file.filename == '':
                return jsonify({'message': 'No selected file'}), 400

            # Get other parameters from form data
            name = request.form.get('name')
            path = request.form.get('path')
            folderId = request.form.get('folderId')
            pageId = request.form.get('pageId')
            workspaceId = request.form.get('workspaceId')
            createdBy = request.form.get('createdBy')
            createdByUser = request.form.get('createdByUser')
            iso365File = False
            
            # Handle null values properly
            if folderId == 'null' or folderId == '':
                folderId = None
            else:
                folderId = int(folderId) if folderId else None
                
            if pageId and pageId != '':
                pageId = int(pageId)
            else:
                pageId = None
                
            if workspaceId and workspaceId != '':
                workspaceId = int(workspaceId)
            else:
                workspaceId = None
                
            if createdBy:
                createdBy = int(createdBy)
            else:
                createdBy = None

            filename = secure_filename(name)
            
            # Create directory based on pageId, workspaceId, or folderId
            if pageId:
                upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], str(pageId))
            elif workspaceId:
                upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], 'workspace', str(workspaceId))
            elif folderId:
                upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], 'folders', str(folderId))
            else:
                upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], 'general')
                
            if not os.path.exists(upload_folder):
                os.makedirs(upload_folder)
            
            file_path = os.path.join(upload_folder, filename)
            file.save(file_path)

            newFile = File(
                Name=name,
                Path=file_path,
                FolderId=folderId,
                PageId=pageId,
                WorkspaceId=workspaceId,
                CreatedBy=createdBy,
                CreatedDateTime=datetime.now(),
                Iso365File=iso365File
            )
            db.session.add(newFile)
            db.session.commit()

            # Eagerly load the CreatedByUser relationship
            db.session.refresh(newFile)

            return jsonify(newFile.serialize()), 201
        
        except Exception as e:
            print(f"Error in file upload: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({'message': f'Internal server error: {str(e)}'}), 500

@fileNameSpace.route('/<int:id>')
@fileNameSpace.response(404, 'File not found')
@fileNameSpace.param('id', 'The file identifier')
class FileResource(Resource):
    @fileNameSpace.doc('GetFile')
    @fileNameSpace.marshal_with(FileModel)
    def get(self, id):
        """Fetch a file given its identifier"""
        file = File.query.options(db.joinedload(File.CreatedByUser)).get_or_404(id)
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
