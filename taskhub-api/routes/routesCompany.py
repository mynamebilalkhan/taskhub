from flask import  request
from flask_restx import  Resource, fields
from app import app, db, api, companyNameSpace
from models import Company
CompanyModel = companyNameSpace.model('Company', {
    'id': fields.Integer(readonly=False, description='The company unique identifier'),
    'name': fields.String(required=True, description='The company name'),
    'applicationId': fields.String(description='The application id'),
    'tenantId': fields.String(description='The tenent id'),
    'clientSecret': fields.String(description='The client secret'),
})

companyNameSpace.route('/')
class Companies(Resource):
    @companyNameSpace.doc('ListCompanies')
    @companyNameSpace.marshal_list_with(CompanyModel)
    def get(self):
        """List all companies"""
        companies = Company.query.all()
        return [company.serialize() for company in companies] 

    @companyNameSpace.doc('CreateCompany')
    @companyNameSpace.expect(CompanyModel)
    @companyNameSpace.marshal_with(CompanyModel, code=201)
    def post(self):
        """Create a new company"""
        data = request.json
        newCompany = Company(
            Name=data['name'],
            ApplicationId=data["applicationId"],
            TenantId=data["tenantId"],
            ClientSecret=data["clientSecret"]
            )
        db.session.add(newCompany)
        db.session.commit()
        return newCompany.serialize(), 201

@companyNameSpace.route('/<int:id>')
@companyNameSpace.response(404, 'Company not found')
@companyNameSpace.param('id', 'The company identifier')
class CompanyResource(Resource):
    @companyNameSpace.doc('GetCompany')
    @companyNameSpace.marshal_with(CompanyModel)
    def get(self, id):
        """Fetch a company given its identifier"""
        company = Company.query.get_or_404(id)
        return company.serialize()

    @companyNameSpace.doc('DeleteCompany')
    @companyNameSpace.response(204, 'Company deleted')
    def delete(self, id):
        """Delete a company given its identifier"""
        company = Company.query.get_or_404(id)
        db.session.delete(company)
        db.session.commit()
        return '', 204

    @companyNameSpace.expect(CompanyModel)
    @companyNameSpace.marshal_with(CompanyModel)
    def put(self, id):
        """Update a company given its identifier"""
        data = request.json
        company = Company.query.get_or_404(id)
        company.Name = data['name']
        company.ApplicationId = data['applicationId']
        company.TenantId = data['tenantId']
        company.ClientSecret = data['clientSecret']
        db.session.commit()
        return company.serialize()
    
companyNameSpace.add_resource(Companies, '/')
companyNameSpace.add_resource(CompanyResource, '/<int:id>')

api.add_namespace(companyNameSpace)
if __name__ == '__main__':
    app.run(debug=True)