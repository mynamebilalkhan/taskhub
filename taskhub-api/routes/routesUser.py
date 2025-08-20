from datetime import datetime
from sqlalchemy import or_
from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields
from app import app, db, api, userNameSpace
from models import User
from werkzeug.security import generate_password_hash

import stripe

# TODO: Get this.
stripe.api_key = "sk_test_1234..."

UserDtoModel = userNameSpace.model('UserDto', {
    'id': fields.Integer(readOnly=True, description='The user unique identifier'),
    'username': fields.String(required=True, description='The user username'),
    'password': fields.String(required=True, description='The user password'),
    'firstName': fields.String(required=False, description='The user firstname'),
    'lastName': fields.String(required=False, description='The user lastname'),
    'role': fields.Integer(required=False, description='The user role'),
    'paymentPlan': fields.Integer(required=False, description='The Payment Plan'),
    'paymentDateTime': fields.Integer(required=False, description='The Payment Plan date time'),
    'companyId': fields.Integer(required=False, description='The user company identifier'),
    'company': fields.String(required=False, description='The user company name'),
    'createdDateTime': fields.DateTime(required=False, description='The created date time'),
    'fullName': fields.String(required=False, description='The full name'),
    'externalUsername': fields.String(required=False, description='The external username')
})
userFilterParams = userNameSpace.parser()
userFilterParams.add_argument('companyId', type=str, required=False, help='The users filters by company id')
userFilterParams.add_argument('searchQuery', type=str, required=False, help='The user filters by firstname, lastname or username')
#add name surname
@userNameSpace.route('/')
class Users(Resource):
    @userNameSpace.doc('ListUsers')
    @userNameSpace.expect(userFilterParams)
    @userNameSpace.marshal_list_with(UserDtoModel)
    def get(self):
        """List all users"""
        query = User.query

        searchQuery = request.args.get('searchQuery')
        companyId = request.args.get('companyId')

        if searchQuery:
            search_pattern = f"%{searchQuery}%"
            query = query.filter(or_(
                User.FirstName.ilike(search_pattern),
                User.LastName.ilike(search_pattern),
                User.Username.ilike(search_pattern)
        ))

        query = query.filter_by(CompanyId=companyId)

        users = query.all()
        return [user.serialize() for user in users]

    @userNameSpace.doc('CreateUser')
    @userNameSpace.expect(UserDtoModel)
  #  @userNameSpace.marshal_with(user_model, code=201)
    def post(self):
        """Create a new user"""
        data = request.json
        print("data",data)

        # Handle optional companyId
        company_id = data.get('companyId')
        
        existingUser = User.query.filter_by(Username=data['username'], CompanyId=company_id).first()
        if existingUser:
            return {'message': 'Username already exists within company.'}, 400
        hashedPassword = generate_password_hash(data['password'])
        newUser = User(
            Username=data['username'],
            Role=data.get('role'),
            FirstName=data.get('firstName'),
            LastName=data.get('lastName'),
            CompanyId=company_id,
            PaymentPlan=data.get('paymentPlan'),
            CreatedDateTime=datetime.now(),
            Password = hashedPassword,
            ExternalUsername = data.get('externalUsername')
        )
        try:
            db.session.add(newUser)
            db.session.commit()
            return newUser.serialize(), 201
        except Exception as e:
            print(f"Error creating user: {e}")
            db.session.rollback()
            return {'message': f'Failed to create user: {e}'}, 500

@userNameSpace.route('/<int:id>')
@userNameSpace.response(404, 'User not found')
@userNameSpace.param('id', 'The user identifier')
class UserResource(Resource):
    @userNameSpace.doc('GetUser')
    @userNameSpace.marshal_with(UserDtoModel)
    def get(self, id):
        """Fetch a user given its identifier"""
        user = User.query.get_or_404(id)
        return user.serialize()

    @userNameSpace.doc('UpdateUser')
    @userNameSpace.expect(UserDtoModel)
    @userNameSpace.marshal_with(UserDtoModel)
    def put(self, id):
        """Update a user given its identifier"""
        user = User.query.get_or_404(id)
        data = request.json
        user.Username = data.get('username', user.Username)
        user.Role = data.get('role', user.Role)
        user.FirstName = data.get('firstName', user.FirstName)
        user.PaymentPlan = data.get('paymentPlan', user.PaymentPlan)
        user.LastName = data.get('lastName', user.LastName)
        user.CompanyId = data.get('companyId', user.CompanyId)
        user.ExternalUsername = data.get('externalUsername', user.ExternalUsername)
        db.session.commit()
        return user.serialize()

    @userNameSpace.doc('DeleteUser')
    @userNameSpace.response(204, 'User deleted')
    def delete(self, id):
        """Delete a user given its identifier"""
        user = User.query.get_or_404(id)
        db.session.delete(user)
        db.session.commit()
        return '', 204
@userNameSpace.route('/username/<string:username>')
@userNameSpace.response(404, 'User not found')
@userNameSpace.param('username', 'The user username')
class UserByUsernameResource(Resource):
    @userNameSpace.doc('GetUserByUsername')
    @userNameSpace.marshal_with(UserDtoModel)
    def get(self, username):
        """Fetch a user given its username"""
        user = User.query.filter_by(Username=username).first()
        if not user:
            return {'message': 'User not found'}, 404
        return user.serialize()

@userNameSpace.route('/<int:id>/pay')
class UserPaymentResource(Resource):
    @userNameSpace.doc('PayForUserPlan')
    def post(self, id):
        """
        Create a Stripe checkout session for the given user and plan.
        Returns a JSON object with { "checkoutUrl": "..." }.
        """

        # 1) Read JSON from client
        data = request.json or {}
        plan_name = data.get('planName', 'Unknown')

        # 2) (Example) Map plan_name -> your Stripe Price ID
        #    In Stripe dashboard, create "price_..." objects for each subscription tier
        if plan_name == "Core":
            price_id = "price_abc123"
        elif plan_name == "Collaboration":
            price_id = "price_def456"
        else:
            price_id = "price_xyz789"  # fallback or handle error

        # 3) Create Stripe checkout session
        #    mode="subscription" for recurring, or mode="payment" for one-time
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url="http://127.0.0.1:5000/payment/success",
            cancel_url="http://127.0.0.1:5000/payment/cancel",
            # Optionally, pass metadata or subscription data. For example:
            metadata={
                "user_id": id,
                "plan_name": plan_name
            }
        )

        # TODO: If it is OK, update User Plan in DB.

        # 4) Return the checkout URL so client can redirect
        return jsonify({"checkoutUrl": session.url}), 200

userNameSpace.add_resource(Users, '/')
userNameSpace.add_resource(UserResource, '/<int:id>')
userNameSpace.add_resource(UserByUsernameResource, '/username/<string:username>')
userNameSpace.add_resource(UserPaymentResource, '/<int:id>/pay')

api.add_namespace(userNameSpace)
if __name__ == '__main__':
    app.run(debug=True)
