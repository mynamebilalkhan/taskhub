from datetime import datetime
from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields
from app import app, db, api, syncNameSpace
from models import Task


# Define a model for a Task
TaskModel = syncNameSpace.model('Task', {
    'id': fields.Integer(readOnly=True, description='The task unique identifier'),
    'title': fields.String(required=True, description='The task title'),
    'description': fields.String(required=True, description='The task description'),
    'dueDate': fields.Date(description='The task due date'),
    'status': fields.String(description='The task status'),
    'priority': fields.String(description='The task priority'),
    'assignedTo': fields.Integer(description='The ID of the user assigned to the task'),
    'assignedToName': fields.String(description='The name of the user assigned to the task'),
    'createdBy': fields.Integer(description='The ID of the user who created the task'),
    'createdByName': fields.String(description='The name of the user who created to the task'),
    'createdDateTime': fields.DateTime(description='The date and time the task was created'),
    'parentId': fields.Integer(description='The ID of the parent task, if any'),
    'pageId': fields.Integer(description='The ID of the page this task belongs to'),
    'pageName': fields.String(description='The name of page of the task')
})


@syncNameSpace.route('/<int:id>')
class SyncResource(Resource):
    @syncNameSpace.doc('SyncTask')
    @syncNameSpace.expect(TaskModel)
    @syncNameSpace.marshal_with(TaskModel)
    def put(self, id):
        '''sync task by ID'''
        data = request.json
        parentId = data.get('parentId')
        if parentId == 0 :
            parentId = None
        assigneId = data.get('assignedTo')
        if assigneId == 0 :
            assigneId = None
        task = Task.query.get_or_404(id)
        task.Title = data.get('title', task.Title)
        task.Description = data.get('description', task.Description)
        task.DueDate = data.get('dueDate', task.DueDate)
        task.Status = data.get('status', task.Status)
        task.Priority = data.get('priority', task.Priority)
        task.AssignedTo = assigneId
        task.CreatedBy = data.get('createdBy', task.CreatedBy)
        task.LastModifyDateTime = datetime.now()
        task.ParentId = parentId
        task.PageId = data.get('pageId', task.PageId)
        db.session.commit()
        return task

# Register TaskList and TaskResource resources with the API
syncNameSpace.add_resource(SyncResource, '/<int:id>')
api.add_namespace(syncNameSpace)
if __name__ == '__main__':
    app.run(debug=True)
