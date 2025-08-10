from datetime import datetime
from flask import request
from flask_restx import Resource, fields
from app import app, db, api, cardNameSpace
from models import Card, User, CardConnection, Workspace

# Swagger model
CardConnectionModel = cardNameSpace.model('CardConnection', {
    'fromCardId': fields.Integer(required=True, description='ID of source card'),
    'toCardId': fields.Integer(required=True, description='ID of target card')
})
# Swagger model
CardPostionModel = cardNameSpace.model('CardPostion', {
    'cardId': fields.Integer(required=True, description='ID of card'),
    'x': fields.Float(required=True, description='x postion'),
    'y': fields.Float(required=True, description='y postion')
})
# Swagger model
CardModel = cardNameSpace.model('Card', {
    'id': fields.Integer(readOnly=True, description='The card unique identifier'),
    'name': fields.String(description='Card title'),
    'description': fields.String(description='Card description'),
    'status': fields.String(description='Card status'),
    'priority': fields.String(description='Card priority'),
    'category': fields.String(description='Card category'),
    'dueDate': fields.Date(description='Due date'),
    'assignedTo': fields.Integer(description='Assigned user ID'),
    'assignedToName': fields.String(description='Assigned user full name'),
    'createdBy': fields.Integer(description='Created by user ID'),
    'createdByUser': fields.String(description='Created by full name'),
    'createdDateTime': fields.DateTime(description='Creation timestamp'),
    'lastModifyDateTime': fields.DateTime(description='Last modified timestamp'),
    'c': fields.Integer(description='Page ID the wokrspace created from card'),
    'x': fields.Float(description='x postion'),
    'y': fields.Float(description='y postion'),
    'pageId': fields.Integer(description='Page ID the card belongs to'),
    'workspaceId': fields.Integer(description='workspace ID the card created'),
})

# Query params
cardFilterParams = cardNameSpace.parser()
cardFilterParams.add_argument('pageId', type=int, required=False, help='Filter by page ID')
cardFilterParams.add_argument('assignedTo', type=int, required=False, help='Filter by assigned user ID')
cardFilterParams.add_argument('createdBy', type=int, required=False, help='Filter by creator ID')
cardFilterParams.add_argument('status', type=str, required=False, help='Filter by status')

@cardNameSpace.route('/')
class CardList(Resource):
    @cardNameSpace.doc('ListCards')
    @cardNameSpace.expect(cardFilterParams)
    @cardNameSpace.marshal_list_with(CardModel)
    def get(self):
        """List all cards with optional filters"""
        pageId = request.args.get('pageId')
        assignedTo = request.args.get('assignedTo')
        createdBy = request.args.get('createdBy')
        status = request.args.get('status')

        query = Card.query
        if pageId:
            query = query.filter_by(PageId=pageId)
        if assignedTo:
            query = query.filter_by(AssignedTo=assignedTo)
        if createdBy:
            query = query.filter_by(CreatedBy=createdBy)
        if status:
            query = query.filter_by(Status=status)

        return [card.serialize() for card in query.all()]

    @cardNameSpace.doc('CreateCard')
    @cardNameSpace.expect(CardModel)
    @cardNameSpace.marshal_with(CardModel, code=201)
    def post(self):
        """Create a new card"""
        data = request.json
        now = datetime.now()
        assigneId = data.get('assignedTo')
        if assigneId == 0 :
            assigneId = None
        card = Card(
            Name=data.get('name'),
            Description=data.get('description'),
            Status=data.get('status'),
            Priority=data.get('priority'),
            Category=data.get('category'),
            DueDate=data.get('dueDate'),
            AssignedTo=assigneId,
            CreatedBy=data.get('createdBy'),
            CreatedDateTime=now,
            LastModifyDateTime=now,
            PageId=data.get('pageId')
        )
        db.session.add(card)
        db.session.commit()
        return card.serialize(), 201

@cardNameSpace.route('/<int:id>')
@cardNameSpace.response(404, 'Card not found')
@cardNameSpace.param('id', 'Card identifier')
class CardResource(Resource):
    @cardNameSpace.doc('GetCard')
    @cardNameSpace.marshal_with(CardModel)
    def get(self, id):
        """Get card by ID"""
        card = Card.query.get_or_404(id)
        return card.serialize()

    @cardNameSpace.doc('UpdateCard')
    @cardNameSpace.expect(CardModel)
    @cardNameSpace.marshal_with(CardModel)
    def put(self, id):
        """Update existing card"""
        card = Card.query.get_or_404(id)
        data = request.json
        card.Name = data.get('name', card.Name)
        card.Description = data.get('description', card.Description)
        card.Status = data.get('status', card.Status)
        card.Priority = data.get('priority', card.Priority)
        card.Category = data.get('category', card.Category)
        card.DueDate = data.get('dueDate', card.DueDate)
        card.AssignedTo = data.get('assignedTo', card.AssignedTo)
        card.CreatedBy = data.get('createdBy', card.CreatedBy)
        card.PageId = data.get('pageId', card.PageId)
        card.LastModifyDateTime = datetime.now()

        db.session.commit()
        return card.serialize()

    @cardNameSpace.doc('DeleteCard')
    @cardNameSpace.response(204, 'Card deleted')
    def delete(self, id):
        """Delete a card"""
        try:
            card = Card.query.get_or_404(id)
            
            # Handle related data before deleting the card
            # 1. Set CreatedFromCardId to NULL for any workspaces that reference this card
            related_workspaces = Workspace.query.filter_by(CreatedFromCardId=id).all()
            for workspace in related_workspaces:
                workspace.CreatedFromCardId = None
            
            # 2. Delete any card connections that reference this card
            related_connections = CardConnection.query.filter(
                (CardConnection.FromCardId == id) | (CardConnection.ToCardId == id)
            ).all()
            for connection in related_connections:
                db.session.delete(connection)
            
            # 3. Now delete the card
            db.session.delete(card)
            db.session.commit()
            return '', 204
            
        except Exception as e:
            db.session.rollback()
            # Log the error for debugging
            print(f"Error deleting card {id}: {str(e)}")
            return {'error': f'Failed to delete card: {str(e)}'}, 500

@cardNameSpace.route('/Company/<int:companyId>')
@cardNameSpace.response(404, 'No cards found for this company')
@cardNameSpace.param('companyId', 'The company ID')
class CardsByCompany(Resource):
    @cardNameSpace.doc('GetCardsByCompany')
    @cardNameSpace.marshal_list_with(CardModel)
    def get(self, companyId):
        """List all cards created by users from a specific company"""
        cards = Card.query.join(User, Card.CreatedBy == User.Id).filter(User.CompanyId == companyId).all()
        if not cards:
            cardNameSpace.abort(404, "No cards found for this company")
        return [card.serialize() for card in cards]

@cardNameSpace.route('/connect')
class CardConnect(Resource):
    @cardNameSpace.doc('ConnectTwoCards')
    @cardNameSpace.expect(CardConnectionModel)
    def post(self):
        """Create a connection between two cards"""
        data = request.json
        from_id = data.get('fromCardId')
        to_id = data.get('toCardId')

        if from_id == to_id:
            return {"message": "Cannot connect a card to itself"}, 400

        # Proveri da li postoji veza već
        exists = CardConnection.query.filter_by(FromCardId=from_id, ToCardId=to_id).first()
        if exists:
            return "", 200

        connection = CardConnection(FromCardId=from_id, ToCardId=to_id)
        db.session.add(connection)
        db.session.commit()
        return connection.serialize(), 201
@cardNameSpace.route('/position')
class CardPostion(Resource):
    @cardNameSpace.doc('CardPostion')
    @cardNameSpace.expect(CardPostionModel)
    def put(self):
        """Create a connection between two cards"""
        data = request.json
        card_id = data.get('cardId')
        x = data.get('x')
        y = data.get('y')
       
        # Proveri da li postoji veza već
        card = Card.query.get_or_404(card_id)
        card.X = x
        card.Y = y
        db.session.commit()
        return card.serialize(), 201

@cardNameSpace.route('/connections')
class CardConnectionsByPage(Resource):
    @cardNameSpace.doc('GetCardConnectionsByPageId')
    @cardNameSpace.param('pageId', 'Page ID to filter connections by')
    def get(self):
        """Get all card connections for a given page"""
        page_id = request.args.get('pageId', type=int)

        if not page_id:
            return {"message": "Missing required parameter: pageId"}, 400

        # Učitaj sve card ID-jeve sa tog page-a
        card_ids = [c.Id for c in Card.query.filter_by(PageId=page_id).all()]
        if not card_ids:
            return [], 200

        # Vrati sve veze gde je izvor ili cilj kartica sa te strane
        connections = CardConnection.query.filter(
            CardConnection.FromCardId.in_(card_ids),
            CardConnection.ToCardId.in_(card_ids)
        ).all()

        return [conn.serialize() for conn in connections], 200

# Register resources
cardNameSpace.add_resource(CardList, '/')
cardNameSpace.add_resource(CardResource, '/<int:id>')
cardNameSpace.add_resource(CardsByCompany, '/Company/<int:companyId>')
cardNameSpace.add_resource(CardConnect, '/connect')
cardNameSpace.add_resource(CardConnectionsByPage, '/connections')
cardNameSpace.add_resource(CardPostion, '/position')

api.add_namespace(cardNameSpace)
if __name__ == '__main__':
    app.run(debug=True)
