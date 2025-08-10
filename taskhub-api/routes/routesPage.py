from datetime import datetime
from flask import request
from flask_restx import Resource, fields
from app import app, db, api, pageNameSpace
from models import Page, User

# Swagger model
PageModel = pageNameSpace.model('Page', {
    'id': fields.Integer(readOnly=True, description='The page unique identifier'),
    'name': fields.String(required=True, description='The page title'),
    'workspaceId': fields.Integer(required=True, description='The workspace ID this page belongs to'),
    # Derived from the workspace's folder. Not required on create/update payloads.
    'vaultId': fields.Integer(required=False, description='The vault ID this page belongs to'),
    'createdBy': fields.Integer(description='User who created the page'),
    'createdByUser': fields.String(description='Full name of creator'),
    'createdDateTime': fields.DateTime(description='Creation timestamp'),
    'lastModifyDateTime': fields.DateTime(description='Last modified timestamp'),
    'orderIndex': fields.Integer(description='Order index of task list'),
})
PageRenameModel = pageNameSpace.model('PageRename', {
    'name': fields.String(required=True, description='The page title'),
})

PageTaskOrderModel = pageNameSpace.model('PageTaskOrder', {
    'pageId': fields.Integer(required=True, description='The page id'),
    'orderIndex': fields.Integer(required=True, description='The task list order number'),
})
# Filter params
pageFilterParams = pageNameSpace.parser()
pageFilterParams.add_argument('workspaceId', type=int, required=False, help='Workspace ID to filter by')

@pageNameSpace.route('/')
class PageList(Resource):
    @pageNameSpace.doc('ListPages')
    @pageNameSpace.expect(pageFilterParams)
    @pageNameSpace.marshal_list_with(PageModel)
    def get(self):
        """List all pages, optionally filtered by workspace ID"""
        workspace_id = request.args.get('workspaceId')
        query = Page.query
        if workspace_id:
            query = query.filter_by(WorkspaceId=workspace_id)
        pages = query.all()
        return [page.serialize() for page in pages]

    @pageNameSpace.doc('CreatePage')
    @pageNameSpace.expect(PageModel)
    @pageNameSpace.marshal_with(PageModel, code=201)
    def post(self):
        """Create a new page"""
        data = request.json
        new_page = Page(
            Name=data['name'],
            WorkspaceId=data['workspaceId'],
            CreatedBy=data.get('createdBy'),
            CreatedDateTime=datetime.now(),
            LastModifyDateTime=datetime.now()
        )
        db.session.add(new_page)
        db.session.commit()
        return new_page.serialize(), 201

@pageNameSpace.route('/<int:id>')
@pageNameSpace.response(404, 'Page not found')
@pageNameSpace.param('id', 'The page identifier')
class PageResource(Resource):
    @pageNameSpace.doc('GetPage')
    @pageNameSpace.marshal_with(PageModel)
    def get(self, id):
        """Fetch a page by ID"""
        page = Page.query.get_or_404(id)
        return page.serialize()

    @pageNameSpace.doc('UpdatePage')
    @pageNameSpace.expect(PageModel)
    @pageNameSpace.marshal_with(PageModel)
    def put(self, id):
        """Update an existing page"""
        page = Page.query.get_or_404(id)
        data = request.json
        page.Name = data.get('name', page.Name)
        page.WorkspaceId = data.get('workspaceId', page.WorkspaceId)
        page.CreatedBy = data.get('createdBy', page.CreatedBy)
        page.LastModifyDateTime = datetime.now()
        db.session.commit()
        return page.serialize()

    @pageNameSpace.doc('DeletePage')
    @pageNameSpace.response(204, 'Page deleted')
    def delete(self, id):
        """Delete a page"""
        page = Page.query.get_or_404(id)
        db.session.delete(page)
        db.session.commit()
        return '', 204

@pageNameSpace.route('/Company/<int:companyId>')
@pageNameSpace.response(404, 'No pages found for this company')
@pageNameSpace.param('companyId', 'The company ID')
class PagesByCompany(Resource):
    @pageNameSpace.doc('GetPagesByCompany')
    @pageNameSpace.marshal_list_with(PageModel)
    def get(self, companyId):
        """List all pages filtered by company ID"""
        pages = Page.query.join(User, Page.CreatedBy == User.Id).filter(User.CompanyId == companyId).all()
        if not pages:
            pageNameSpace.abort(404, "No pages found for this company")
        return [page.serialize() for page in pages]
@pageNameSpace.route('/rename/<int:pageId>')
@pageNameSpace.response(404, 'No pages found ')
@pageNameSpace.param('pageId', 'The page ID')
class RenamePages(Resource):
    @pageNameSpace.doc('Rename page')
    @pageNameSpace.expect(PageRenameModel)
    @pageNameSpace.marshal_with(PageRenameModel)
    def put(self, pageId):
        """Update name of pages"""
        page = Page.query.get_or_404(pageId)
        data = request.json
        page.Name = data.get('name', page.Name)
        page.LastModifyDateTime = datetime.now()
        db.session.commit()
        return "", 200
    
@pageNameSpace.route('/order')
class PageTaskListOrder(Resource):
    @pageNameSpace.doc('task list order page')
    @pageNameSpace.expect(PageTaskOrderModel)
    @pageNameSpace.marshal_with(PageTaskOrderModel)
    def put(self):
        """Update order of task list"""

        data = request.json
        page_id = data.get('pageId')
        order_index = data.get('orderIndex')
        page = Page.query.get_or_404(page_id)
       
        page.OrderIndex = order_index
        page.LastModifyDateTime = datetime.now()
        db.session.commit()
        return "", 200    
# Register endpoints
pageNameSpace.add_resource(PageList, '/')
pageNameSpace.add_resource(PageResource, '/<int:id>')
pageNameSpace.add_resource(PagesByCompany, '/Company/<int:companyId>')
pageNameSpace.add_resource(RenamePages, '/rename/<int:pageId>')
pageNameSpace.add_resource(PageTaskListOrder, '/order')
api.add_namespace(pageNameSpace)

if __name__ == '__main__':
    app.run(debug=True)
