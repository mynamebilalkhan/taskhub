import os
from datetime import datetime
from flask import request, jsonify, current_app
from flask_restx import Resource, fields
from werkzeug.utils import secure_filename
from app import app, db, api, fileNameSpace
from models import File, User

FileModel = fileNameSpace.model('File', {
    'id': fields.Integer(readOnly=True, description='The file unique identifier'),
    'name': fields.String(required=True, description='The file name'),
    'path': fields.String(required=True, description='The file path'),
    'folderId': fields.Integer(description='The folder identifier'),
    'pageId': fields.Integer(description='The page identifier'),
    'createdBy': fields.Integer(description='The created by user identifier'),
    'createdDateTime': fields.DateTime(description='The created date time'),
    'createdByUser': fields.String(description='The user who create file'),
    'iso365File': fields.Boolean( description='The flag for o365 files')
})


fileFilterParams = fileNameSpace.parser()
fileFilterParams.add_argument('folderId', type=int, required=False, help='The Folder id to search for')
fileFilterParams.add_argument('pageId', type=int, required=False, help='The Page id to search for')
@fileNameSpace.route('/')
class Files(Resource):
    @fileNameSpace.doc('ListFiles')
    @fileNameSpace.expect(fileFilterParams)
    @fileNameSpace.marshal_list_with(FileModel)
    def get(self):
        """List all files"""
        folderId = request.args.get('folderId')
        pageId = request.args.get('pageId')

        query = File.query
        if folderId:
            query = query.filter_by(FolderId=folderId)
        if pageId:
            query = query.filter_by(PageId=pageId)

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
        pageId = data.get('pageId')
        if pageId == 0 :
            pageId = None
        isO365 = data.get('iso365File')
        if isO365 is None :
            isO365 = False
        newFile = File(
            Name=data['name'],
            Path=data['path'],
            FolderId=folderId,
            PageId=pageId,
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
        pageId = data.get('pageId')
        if pageId == 0 :
            pageId = None
        
        file.Name = data.get('name')
        file.Path = data.get('path')
        file.FolderId = folderId
        file.PageId = pageId
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

@fileNameSpace.route('/Page/<int:pageId>')
@fileNameSpace.response(404, 'No files found for this page')
@fileNameSpace.param('pageId', 'The page identifier')
class FilesByPage(Resource):
    @fileNameSpace.doc('GetFilesByPage')
    @fileNameSpace.marshal_list_with(FileModel)
    def get(self, pageId):
        """List all files filtered by page ID"""
        files = File.query.filter_by(PageId=pageId).all()
        if not files:
            return []
        return [file.serialize() for file in files]
    
# File upload configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@fileNameSpace.route('/upload')
class FileUpload(Resource):
    @fileNameSpace.doc('UploadFile')
    def post(self):
        """Upload a file to a page or folder"""
        try:
            if 'file' not in request.files:
                return {'error': 'No file part'}, 400
            
            file = request.files['file']
            if file.filename == '':
                return {'error': 'No file selected'}, 400
            
            if not allowed_file(file.filename):
                return {'error': 'File type not allowed'}, 400
            
            # Get form data
            page_id = request.form.get('pageId', type=int)
            folder_id = request.form.get('folderId', type=int)
            created_by = request.form.get('createdBy', type=int)
            
            if not created_by:
                return {'error': 'createdBy is required'}, 400
            
            # Create uploads directory if it doesn't exist
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            
            # Secure filename and save file
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_filename = f"{timestamp}_{filename}"
            file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
            file.save(file_path)
            
            # Create file record in database
            new_file = File(
                Name=filename,
                Path=file_path,
                FolderId=folder_id if folder_id else None,
                PageId=page_id if page_id else None,
                CreatedBy=created_by,
                CreatedDateTime=datetime.now(),
                Iso265File=False
            )
            
            db.session.add(new_file)
            db.session.commit()
            
            return new_file.serialize(), 201
            
        except Exception as e:
            return {'error': str(e)}, 500

fileNameSpace.add_resource(Files, '/')
fileNameSpace.add_resource(FileResource, '/<int:id>')
fileNameSpace.add_resource(FilesByCompany, '/Company/<int:companyId>')
fileNameSpace.add_resource(FilesByPage, '/Page/<int:pageId>')
fileNameSpace.add_resource(FileUpload, '/upload')

api.add_namespace(fileNameSpace)
if __name__ == '__main__':
    app.run(debug=True)