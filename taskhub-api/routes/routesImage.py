from datetime import datetime
from flask import request
from flask_restx import Resource, fields
from app import app, db, api, imageNameSpace
from models import Image

# Swagger model
ImageModel = imageNameSpace.model('Image', {
    'id': fields.Integer(readOnly=True, description='Image ID'),
    'name': fields.String(description='Image name'),
    'base64': fields.String(description='Base64 image content'),
    'pageId': fields.Integer(description='Page ID'),
    'pageName': fields.String(description='Page name'),
    'createdBy': fields.Integer(description='Created by user ID'),
    'createdByUser': fields.String(description='Created by full name'),
    'createdDateTime': fields.DateTime(description='Creation time'),
    'lastModifyDateTime': fields.DateTime(description='Last modified time'),
    'orderIndex': fields.Integer(required=True, description='The image order')
})
ImageOrderModel = imageNameSpace.model('ImageOrder', {
    'imageId': fields.Integer(readOnly=True, description='The imge unique identifier'),
    'orderIndex': fields.Integer(required=True, description='The image order')
})
# Query param filter
imageFilterParams = imageNameSpace.parser()
imageFilterParams.add_argument('pageId', type=int, required=False, help='Filter by Page ID')

@imageNameSpace.route('/')
class ImageList(Resource):
    @imageNameSpace.expect(imageFilterParams)
    @imageNameSpace.marshal_list_with(ImageModel)
    def get(self):
        """List all images with optional pageId filter"""
        page_id = request.args.get('pageId')
        query = Image.query
        if page_id:
            query = query.filter_by(PageId=page_id)
        return [img.serialize() for img in query.all()]

    @imageNameSpace.expect(ImageModel)
    @imageNameSpace.marshal_with(ImageModel, code=201)
    def post(self):
        """Create new image"""
        data = request.json
        now = datetime.utcnow()

        image = Image(
            Name=data.get('name'),
            Base64Data=data.get('base64'),
            PageId=data.get('pageId'),
            CreatedBy=data.get('createdBy'),
            CreatedDateTime=now,
            LastModifyDateTime=now
        )
        db.session.add(image)
        db.session.commit()
        return image.serialize(), 201

@imageNameSpace.route('/<int:id>')
@imageNameSpace.response(404, 'Image not found')
@imageNameSpace.param('id', 'Image ID')
class ImageResource(Resource):
    @imageNameSpace.marshal_with(ImageModel)
    def get(self, id):
        """Get image by ID"""
        image = Image.query.get_or_404(id)
        return image.serialize()

    @imageNameSpace.expect(ImageModel)
    @imageNameSpace.marshal_with(ImageModel)
    def put(self, id):
        """Update existing image"""
        image = Image.query.get_or_404(id)
        data = request.json

        image.Name = data.get('name', image.Name)
        image.Base64Data = data.get('base64', image.Base64Data)
        image.PageId = data.get('pageId', image.PageId)
        image.CreatedBy = data.get('createdBy', image.CreatedBy)
        image.LastModifyDateTime = datetime.utcnow()

        db.session.commit()
        return image.serialize()

    @imageNameSpace.response(204, 'Image deleted')
    def delete(self, id):
        """Delete image"""
        image = Image.query.get_or_404(id)
        db.session.delete(image)
        db.session.commit()
        return '', 204
    
@imageNameSpace.route('/order')
class ImageOrder(Resource):
    @imageNameSpace.doc('ImageOrder')
    @imageNameSpace.expect(ImageOrderModel)
    def put(self):
        """Update a order on page"""
        data = request.json
        image_id = data.get('imageId')
        order_index = data.get('orderIndex')
       
        image = Image.query.get_or_404(image_id)
        image.OrderIndex = order_index
        db.session.commit()
        return image.serialize(), 201
    
imageNameSpace.add_resource(ImageList, '/')
imageNameSpace.add_resource(ImageResource, '/<int:id>')
imageNameSpace.add_resource(ImageOrder, '/order')

# Register namespace
api.add_namespace(imageNameSpace)
if __name__ == '__main__':
    app.run(debug=True)
