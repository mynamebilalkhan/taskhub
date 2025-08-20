from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_restx import Api, Namespace
from flask_migrate import Migrate
from flask_cors import CORS
import os

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, origins=["http://127.0.0.1:1430", "http://localhost:1430"], 
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

api = Api(app, version='1.1', title='Task API',
          description='A Task management API',
          )


DB_USERNAME = 'postgres'
DB_PASSWORD = 'postgres'
DB_HOST = '127.0.0.1'
DB_PORT = '5432'
DB_NAME = 'TaskManagementdb'

DB_URI = f'postgresql+psycopg2://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'

app.config['SQLALCHEMY_DATABASE_URI'] = DB_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
from database import db
db.init_app(app)
migrate = Migrate(app, db)
from models import *
import migration
# Import routes
taskNameSpace = Namespace('Task', description='Operations with Tasks')
folderNameSpace = Namespace('Folder', description='Operations with Folders')
fileNameSpace = Namespace('File', description='Operations with Files')
textBoxNameSpace = Namespace('TextBox', description='Operations with TextBox')
userNameSpace = Namespace('User', description='Operations with Users')
companyNameSpace = Namespace('Company', description='Operations with Companies')
accountNameSpace = Namespace('Account', description='Operations for Login')
syncNameSpace = Namespace('Sync', description='Operations for Sync')
healthNameSpace = Namespace('Health', description='Operations for Health')
collaborationNameSpace = Namespace('Collaboration', description='Operations for Collaboration')
vaultNameSpace = Namespace('Vault', description='Operations for vault')
urlNameSpace = Namespace('Url', description='Operations for url')
workspaceNameSpace = Namespace('Workspace', description='Operations for workspace')
eventNameSpace = Namespace('Event', description='Operations for event')
pageNameSpace = Namespace('Page', description='Operations for pages')
cardNameSpace = Namespace('Card', description='Operations for cards')
imageNameSpace = Namespace('Image', description='Operations for Image')

import routes.routesTask as routesTask
import routes.routesFolder as routesFolder
import routes.routesFile as routesFile
import routes.routesTextBox as routesTextBox
import routes.routesUser as routesUser
import routes.routesCompany as routesCompany
import routes.routesAccount as routesAccount
import routes.routesSync as routesSync
import routes.routesHealth as routesHealth
import routes.routesCollaboration as routesCollaboration
import routes.routesVault as routesVault
import routes.routesUrl as routesUrl
import routes.routesWorkspace as routesWorkspace
import routes.routesEvent as routesEvent
import routes.routesPage as routesPage
import routes.routesCard as routesCard
import routes.routesImage as routesImage

# Add namespaces to API
api.add_namespace(taskNameSpace)
api.add_namespace(folderNameSpace)
api.add_namespace(fileNameSpace)
api.add_namespace(textBoxNameSpace)
api.add_namespace(userNameSpace)
api.add_namespace(companyNameSpace)
api.add_namespace(accountNameSpace)
api.add_namespace(syncNameSpace)
api.add_namespace(healthNameSpace)
api.add_namespace(collaborationNameSpace)
api.add_namespace(vaultNameSpace)
api.add_namespace(urlNameSpace)
api.add_namespace(workspaceNameSpace)
api.add_namespace(eventNameSpace)
api.add_namespace(pageNameSpace)
api.add_namespace(cardNameSpace)
api.add_namespace(imageNameSpace)

# Route to serve uploaded files
@app.route('/uploads/<path:pageId>/<path:filename>')
def download_file(pageId, filename):
    upload_folder = os.path.join('uploads', pageId)
    return send_from_directory(upload_folder, filename)

# Route to serve files from folders
@app.route('/uploads/folders/<path:folderId>/<path:filename>')
def download_folder_file(folderId, filename):
    upload_folder = os.path.join('uploads', 'folders', folderId)
    return send_from_directory(upload_folder, filename)

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)


