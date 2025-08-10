from datetime import datetime
from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields
from sqlalchemy import null
from app import app, db, api, urlNameSpace
from models import Url, User


UrlModel = urlNameSpace.model('Url', {
    'id': fields.Integer(readOnly=True, description='The url unique identifier'),
    'name': fields.String(required=True, description='The url title'),
    'url': fields.String(required=True, description='The url address'),
    'createdBy': fields.Integer(description='The url created by id'),
    'folderId': fields.Integer(description='The folder id'),
    'createdDateTime': fields.DateTime(description='The url created date time'),
    'createdByUser': fields.String(required=True, description='The user that create by user')
})

# Resource for managing urls
@urlNameSpace.route('/')
class Urls(Resource):
    @urlNameSpace.doc('ListUrls')
    @urlNameSpace.marshal_list_with(UrlModel)
    def get(self):
        """List all urls"""
        urls = Url.query.all()
        return [url.serialize() for url in urls]

    @urlNameSpace.doc('CreateUrl')
    @urlNameSpace.expect(UrlModel)
    @urlNameSpace.marshal_with(UrlModel, code=201)
    def post(self):
        """Create a new url"""
        data = request.json
        newUrl = Url(
            Name=data['name'],
            Url=data['url'],
            CreatedBy=data.get('createdBy'),
            FolderId=data.get('folderId'),
            CreatedDateTime=datetime.now()
        )
        db.session.add(newUrl)
        db.session.commit()
        return newUrl.serialize(), 201
# add endpoint to get all url by companyId
@urlNameSpace.route('/<int:id>')
@urlNameSpace.response(404, 'Url not found')
@urlNameSpace.param('id', 'The url identifier')
class UrlResource(Resource):
    @urlNameSpace.doc('GetUrl')
    @urlNameSpace.marshal_with(UrlModel)
    def get(self, id):
        """Fetch a url given its identifier"""
        url = Url.query.get_or_404(id)
        return url.serialize()

    @urlNameSpace.doc('UpdateUrl')
    @urlNameSpace.expect(UrlModel)
    @urlNameSpace.marshal_with(UrlModel)
    def put(self, id):
        """Update a url given its identifier"""
        url = Url.query.get_or_404(id)
        data = request.json
        url.Name = data.get('name', url.Name)
        url.Url = data.get('url', url.Url)
        url.FolderId = data.get('folderId', url.FolderId)
        url.CreatedBy = data.get('createdBy', url.CreatedBy)
        db.session.commit()
        return url.serialize()

    @urlNameSpace.doc('DeleteUrl')
    @urlNameSpace.response(204, 'Url deleted')
    def delete(self, id):
        """Delete a url given its identifier"""
        url = Url.query.get_or_404(id)
        db.session.delete(url)
        db.session.commit()
        return '', 204
@urlNameSpace.route('/Company/<int:companyId>')
@urlNameSpace.response(404, 'No urls found for this company')
@urlNameSpace.param('companyId', 'The company identifier')
class UrlsByCompany(Resource):
    @urlNameSpace.doc('GetUrlsByCompany')
    @urlNameSpace.marshal_list_with(UrlModel)
    def get(self, companyId):
        """List all urls filtered by company ID"""
        urls = Url.query.join(User, Url.CreatedBy == User.Id).filter(User.CompanyId == companyId).all()
    
        return [url.serialize() for url in urls]

@urlNameSpace.route('/Folder/<int:folderId>')
@urlNameSpace.response(404, 'No urls found for this folder')
@urlNameSpace.param('folderId', 'The folder identifier')
class UrlsByFolder(Resource):
    @urlNameSpace.doc('GetUrlsByFolder')
    @urlNameSpace.marshal_list_with(UrlModel)
    def get(self, folderId):
        """List all urls filtered by folder ID"""
        urls = Url.query.filter(Url.FolderId == folderId).all()
        return [url.serialize() for url in urls]
    
# Add resources to namespace
urlNameSpace.add_resource(Urls, '/')
urlNameSpace.add_resource(UrlResource, '/<int:id>')
urlNameSpace.add_resource(UrlsByCompany, '/Company/<int:companyId>')
urlNameSpace.add_resource(UrlsByFolder, '/Folder/<int:folderId>')
api.add_namespace(urlNameSpace)
if __name__ == '__main__':
    app.run(debug=True)
