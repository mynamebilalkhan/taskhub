from datetime import datetime
from flask import  request
from flask_restx import Resource, fields
from app import app, db, api, textBoxNameSpace
from models import TextBox, User
TextBoxModel = textBoxNameSpace.model('Note', {
    'id': fields.Integer(readOnly=True, description='The note unique identifier'),
    'text': fields.String(required=True, description='The note text'),
    'pageId': fields.Integer(description='The page identifier'),
    'createdBy': fields.Integer(description='The created by user identifier'),
    'createdDateTime': fields.DateTime(description='The created date time'),
    'createdByUser': fields.String(required=True, description='The user who create note'),
    'lastModifyDateTime': fields.DateTime(description='The date and time the task was last modified'),
    'orderIndex': fields.Integer(required=True, description='The note order')
})
TextBoxOrderModel = textBoxNameSpace.model('NoteOrder', {
    'noteId': fields.Integer(readOnly=True, description='The note unique identifier'),
    'orderIndex': fields.Integer(required=True, description='The note order')
})
# Resource for managing tasks
textBoxFilterParams = textBoxNameSpace.parser()
textBoxFilterParams.add_argument('pageId', type=int, required=False, help='The page id to search for')
@textBoxNameSpace.route('/')
class TextBoxes(Resource):
    @textBoxNameSpace.doc('ListTextBoxes')
    @textBoxNameSpace.expect(textBoxFilterParams)
    @textBoxNameSpace.marshal_list_with(TextBoxModel)
    def get(self):
        """List all  text boxes"""
        pageId = request.args.get('pageId')
        query = TextBox.query
        if pageId:
            query = query.filter_by(PageId=pageId)
        notes = query.all()
        return [note.serialize() for note in notes]
    
    @textBoxNameSpace.doc('CreateNote')
    @textBoxNameSpace.expect(TextBoxModel)
    @textBoxNameSpace.marshal_with(TextBoxModel, code=201)
    def post(self):
        """Create a new textbox"""
        data = request.json
        dateTime = datetime.now()
        newNote = TextBox(
            Text=data.get('text'),
            PageId=data.get('pageId'),
            CreatedBy=data.get('createdBy'),
            CreatedDateTime=dateTime,
            LastModifyDateTime=dateTime
        )
        db.session.add(newNote)
        db.session.commit()
        return newNote.serialize(), 201

@textBoxNameSpace.route('/<int:id>')
@textBoxNameSpace.response(404, 'Textbox not found')
@textBoxNameSpace.param('id', 'The textbox identifier')
class TextBoxResource(Resource):
    @textBoxNameSpace.doc('get_textox')
    @textBoxNameSpace.marshal_with(TextBoxModel)
    def get(self, id):
        """Fetch a textboxes given its identifier"""
        note = TextBox.query.get_or_404(id)
        return note.serialize()

    @textBoxNameSpace.doc('update_textbox')
    @textBoxNameSpace.expect(TextBoxModel)
    @textBoxNameSpace.marshal_with(TextBoxModel)
    def put(self, id):
        """Update a textbox given its identifier"""
        note = TextBox.query.get_or_404(id)
        data = request.json
        note.Text = data.get('text')
        note.PageId = data.get('pageId')
        note.CreatedBy = data.get('createdBy')
        note.LastModifyDateTime = datetime.now()
        db.session.commit()
        return note.serialize()

    @textBoxNameSpace.doc('DeleteTextBox')
    @textBoxNameSpace.response(204, 'TextBox deleted')
    def delete(self, id):
        """Delete a textbox given its identifier"""
        textbox = TextBox.query.get_or_404(id)
        db.session.delete(textbox)
        db.session.commit()
        return '', 204
@textBoxNameSpace.route('/Company/<int:companyId>')
@textBoxNameSpace.response(404, 'No note found for this company')
@textBoxNameSpace.param('companyId', 'The note identifier')
class TextBoxByCompany(Resource):
    @textBoxNameSpace.doc('GetTextBoxByCompany')
    @textBoxNameSpace.marshal_list_with(TextBoxModel)
    def get(self, companyId):
        """List all textboxes filtered by company ID"""
        textboxes = TextBox.query.join(User, TextBox.CreatedBy == User.Id).filter(User.CompanyId == companyId).all()
        if not textboxes:
            textBoxNameSpace.abort(404, "No notes found for this company")
        return [note.serialize() for note in textboxes]
@textBoxNameSpace.route('/order')
class TextBoxOrder(Resource):
    @textBoxNameSpace.doc('TextBoxOrder')
    @textBoxNameSpace.expect(TextBoxOrderModel)
    def put(self):
        """Update a order on page"""
        data = request.json
        textbox_id = data.get('noteId')
        order_index = data.get('orderIndex')
       
        textbox = TextBox.query.get_or_404(textbox_id)
        textbox.OrderIndex = order_index
        db.session.commit()
        return textbox.serialize(), 201
textBoxNameSpace.add_resource(TextBoxes, '/')
textBoxNameSpace.add_resource(TextBoxResource, '/<int:id>')
textBoxNameSpace.add_resource(TextBoxByCompany, '/Company/<int:companyId>')
textBoxNameSpace.add_resource(TextBoxOrder, '/order')

api.add_namespace(textBoxNameSpace)
if __name__ == '__main__':
    app.run(debug=True)