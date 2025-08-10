from flask_restx import  Resource
from app import app, api, healthNameSpace

@healthNameSpace.route('/')
class Health(Resource):
    @healthNameSpace.doc('Health')
    def get(self):
        return "OK", 200

healthNameSpace.add_resource(Health, '/')

api.add_namespace(healthNameSpace)
if __name__ == '__main__':
    app.run(debug=True)