from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields
from app import app, db, api, accountNameSpace
from models import User
from werkzeug.security import generate_password_hash, check_password_hash

LoginModel = accountNameSpace.model('Login', {
    'username': fields.String(required=True, description='The user username'),
    'password': fields.String(required=True, description='The user password')
})
UserModel = accountNameSpace.model('User', {
    'id': fields.Integer(readOnly=True, description='The user unique identifier'),
    'username': fields.String(required=True, description='The user username'),
    'password': fields.String(required=True, description='The user password'),
    'firstName': fields.String(description='The user firstname'),
    'lastName': fields.String(description='The user lastname'),
    'role': fields.Integer(description='The user role'),
    'companyId': fields.Integer(description='The user company identifier'),
    'company': fields.String(description='The user company name'),
    'createdDateTime': fields.DateTime(description='The created date time'),
    'fullName': fields.String(description='The full name'),
    'externalUsername': fields.String(description='The external username')
})

@accountNameSpace.route('/')
class Login(Resource):
    @accountNameSpace.doc('LoginModel')
    @accountNameSpace.expect(LoginModel)
    @accountNameSpace.marshal_with(UserModel, code=200)
    def post(self):
        """Check login state"""
        data = request.json
        user = User.query.filter_by(Username=data['username']).first()
        if user is None :
            return '', 401
        if check_password_hash(user.Password, data['password']):
            return user.serialize(), 200
        else: 
            return '', 401

accountNameSpace.add_resource(Login, '/')
api.add_namespace(accountNameSpace)
if __name__ == '__main__':
    app.run(debug=True)