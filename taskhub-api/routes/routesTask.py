from datetime import datetime, date
from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields
from app import app, db, api, taskNameSpace
from models import Task, User, FavoriteTasks, PinnedTasks


# Define a model for a Task
TaskModel = taskNameSpace.model('Task', {
    'id': fields.Integer(readOnly=True, description='The task unique identifier'),
    'title': fields.String(required=True, description='The task title'),
    'description': fields.String(required=True, description='The task description'),
    'dueDate': fields.Date(description='The task due date'),
    'status': fields.String(description='The task status'),
    'priority': fields.String(description='The task priority'),
    'industry': fields.String(description='The task industry'),
    'assignedTo': fields.Integer(description='The ID of the user assigned to the task'),
    'assignedToName': fields.String(description='The name of the user assigned to the task'),
    'createdBy': fields.Integer(description='The ID of the user who created the task'),
    'createdByName': fields.String(description='The name of the user who created to the task'),
    'createdDateTime': fields.DateTime(description='The date and time the task was created'),
    'parentId': fields.Integer(description='The ID of the parent task, if any'),
    'pageId': fields.Integer(description='The ID of the page this task belongs to'),
    'pageName': fields.String(description='The name of page of the task'),
    'lastModifyDateTime': fields.DateTime(description='The date and time the task was last modified')
})
# Define a model for a Task
TaskUserModel = taskNameSpace.model('TaskUser', {
    'id': fields.Integer(readOnly=True, description='The link identifier'),
    'userId': fields.String(required=True, description='The user id'),
    'taskId': fields.String(required=True, description='The task id')
})

# Resource for managing tasks
taskFilterParams = taskNameSpace.parser()
taskFilterParams.add_argument('title', type=str, required=False, help='The task title to search for')
taskFilterParams.add_argument('description', type=str, required=False, help='The task description to search for')
taskFilterParams.add_argument('status', type=str, required=False, help='The task status to filter by')
taskFilterParams.add_argument('assignedTo', type=int, required=False, help='The ID of the user assigned to the task')
taskFilterParams.add_argument('createdBy', type=int, required=False, help='The ID of the user who created the task')
taskFilterParams.add_argument('pageId', type=int, required=False, help='The ID of the page to filter by')
taskFilterParams.add_argument('parentId', type=str, required=False, help='The ID or null of the parent task to filter by ')


#dodavanje imena createby i assignedto projcetname
@taskNameSpace.route('/')
class TaskList(Resource):
    @taskNameSpace.doc('ListTasks')
    @taskNameSpace.expect(taskFilterParams)
    @taskNameSpace.marshal_list_with(TaskModel)
    def get(self):
        '''List all tasks'''
        title = request.args.get('title')
        description = request.args.get('description')
        status = request.args.get('status')
        assignedTo = request.args.get('assignedTo')
        createdBy = request.args.get('createdBy')
        pageId = request.args.get('pageId')
        parentId = request.args.get('parentId')

        # Build the query
        query = Task.query
        
        if title:
            query = query.filter(Task.Title.ilike(f'%{title}%'))
        if description:
            query = query.filter(Task.Description.ilike(f'%{description}%'))
        if status:
            query = query.filter_by(Status=status)
        if assignedTo:
            query = query.filter_by(AssignedTo=assignedTo)
        if createdBy:
            query = query.filter_by(CreatedBy=createdBy)
        if pageId:
            query = query.filter_by(PageId=pageId)
        if parentId is not None:
            if parentId.lower() == 'null':
                query = query.filter(Task.ParentId.is_(None))
            else:
                query = query.filter_by(ParentId=parentId)

        # Execute the query and get results
        tasks = query.all()
        
        return [task.serialize() for task in tasks]


    @taskNameSpace.doc('CreateTask')
    @taskNameSpace.expect(TaskModel)
    @taskNameSpace.marshal_with(TaskModel, code=201)
    def post(self):
        '''Create a new task'''
        try:
            data = request.json
            print(f"Received task data: {data}")
            
            # Validate required fields
            if not data:
                return {'error': 'No data provided'}, 400
            
            if not data.get('title'):
                return {'error': 'Title is required'}, 400
                
            if not data.get('createdBy'):
                return {'error': 'CreatedBy is required'}, 400
                
            if not data.get('pageId'):
                return {'error': 'PageId is required'}, 400
            
            parentId = data.get('parentId')
            if parentId == 0:
                parentId = None
                
            assigneId = data.get('assignedTo')
            if assigneId == 0:
                assigneId = None
                
            dateTime = datetime.now()
            newTask = Task(
                Title=data.get('title'),
                DueDate=data.get('dueDate'),
                Description=data.get('description'),
                Status=data.get('status'),
                Priority=data.get('priority'),
                AssignedTo=assigneId,
                CreatedBy=data['createdBy'],
                CreatedDateTime=dateTime,
                LastModifyDateTime=dateTime,
                ParentId=parentId,
                PageId=data.get('pageId'),
                Industry=data.get('industry')
            )
            
            db.session.add(newTask)
            db.session.commit()
            print(f"Task created successfully: {newTask.Id}")
            return newTask.serialize(), 201
            
        except Exception as e:
            db.session.rollback()
            print(f"Error creating task: {str(e)}")
            return {'error': f'Failed to create task: {str(e)}'}, 500

@taskNameSpace.route('/<int:id>')
class TaskResource(Resource):
    @taskNameSpace.doc('GetTask')
    @taskNameSpace.marshal_with(TaskModel)
    def get(self, id):
        '''Get task by ID'''
        task = Task.query.get_or_404(id)
        return task.serialize()

    @taskNameSpace.doc('UpdateTask')
    @taskNameSpace.expect(TaskModel)
    @taskNameSpace.marshal_with(TaskModel)
    def put(self, id):
        '''Update task by ID'''
        data = request.json
        parentId = data.get('parentId')
        if parentId == 0 :
            parentId = None
        assigneId = data.get('assignedTo')
        if assigneId == 0 :
            assigneId = None
        task = Task.query.get_or_404(id)
        data = request.json
        task.Title = data.get('title', task.Title)
        task.DueDate = data.get('dueDate', task.DueDate)
        task.Description = data.get('description', task.Description)
        task.Status = data.get('status', task.Status)
        task.Priority = data.get('priority', task.Priority)
        task.AssignedTo = assigneId
        task.CreatedBy = data.get('createdBy', task.CreatedBy)
        task.CreatedDateTime = data.get('createdDateTime', task.CreatedDateTime)
        task.ParentId = parentId
        task.PageId = data.get('pageId', task.PageId)
        task.Industry = data.get('industry', task.Industry)
        task.LastModifyDateTime = datetime.now()
        db.session.commit()
        return task.serialize()

    @taskNameSpace.doc('DeleteTask')
    @taskNameSpace.response(204, 'Task deleted')
    def delete(self, id):
        '''Delete task by ID'''
        task = Task.query.get_or_404(id)
        db.session.delete(task)
        db.session.commit()
        return '', 204
@taskNameSpace.route('/Company/<int:companyId>')
@taskNameSpace.response(404, 'No task found for this company')
@taskNameSpace.param('companyId', 'The company identifier')
class TasksByCompany(Resource):
    @taskNameSpace.doc('GetTasksByCompany')
    @taskNameSpace.marshal_list_with(TaskModel)
    def get(self, companyId):
        """List all tasks filtered by company ID"""
        tasks = Task.query.join(User, Task.CreatedBy == User.Id).filter(User.CompanyId == companyId).all()
        return [task.serialize() for task in tasks]

@taskNameSpace.route('/Workspace/<int:workspaceId>')
@taskNameSpace.response(404, 'No task found for this workspace')
@taskNameSpace.param('workspaceId', 'The workspace identifier')
class TasksByWorkspace(Resource):
    @taskNameSpace.doc('GetTasksByWorkspace')
    @taskNameSpace.marshal_list_with(TaskModel)
    def get(self, workspaceId):
        """List all tasks filtered by workspace ID"""
        from models import Page
        # Get all pages in the workspace, then get all tasks for those pages
        pages = Page.query.filter_by(WorkspaceId=workspaceId).all()
        page_ids = [page.Id for page in pages]
        
        if not page_ids:
            return [], 200  # Return empty list if no pages in workspace
            
        tasks = Task.query.filter(Task.PageId.in_(page_ids)).all()
        return [task.serialize() for task in tasks]
@taskNameSpace.route('/Favourite')
class TasksFavourite(Resource):
    @taskNameSpace.doc('MakeFavouriteTaskForUser')
    @taskNameSpace.expect(TaskUserModel)
    @taskNameSpace.marshal_with(TaskUserModel, code=201)
    def post(self):
        '''Create a new favourite task'''
        data = request.json
        userId = data.get('userId')
        if userId == 0 :
            userId = None
        taskId = data.get('taskId')
        if taskId == 0 :
            taskId = None
        newFavouriteTask = FavoriteTasks(
            TaskId=data.get('taskId'),
            UserId=data.get('userId')
        )
        db.session.add(newFavouriteTask)
        db.session.commit()
        return newFavouriteTask.serialize(), 201
    @taskNameSpace.doc('GetFavouriteTasksForUser')
    @taskNameSpace.param('userId', 'User ID to fetch favourite tasks')
    @taskNameSpace.param('taskId', 'Task ID to fetch a specific favourite task (optional)')
    def get(self):
        '''Retrieve favourite tasks for a specific user and optionally a specific task'''
        user_id = request.args.get('userId', type=int)
        task_id = request.args.get('taskId', type=int)

        query = FavoriteTasks.query
        if user_id:
            query = query.filter_by(UserId=user_id)

        if task_id:  # If taskId is provided, filter further
            query = query.filter_by(TaskId=task_id)

        favourite_tasks = query.all()

        return [task.serialize() for task in favourite_tasks], 200

    @taskNameSpace.doc('RemoveFavouriteTaskForUser')
    @taskNameSpace.param('userId', 'User ID to remove favourite task for', required=True)
    @taskNameSpace.param('taskId', 'Task ID to remove from favourites', required=True)
    @taskNameSpace.response(204, 'Favourite task removed successfully')
    @taskNameSpace.response(404, 'Favourite task not found')
    def delete(self):
        '''Remove a task from user's favourites'''
        user_id = request.args.get('userId', type=int)
        task_id = request.args.get('taskId', type=int)
        
        if not user_id or not task_id:
            return {'message': 'Both userId and taskId are required'}, 400
        
        favourite_task = FavoriteTasks.query.filter_by(UserId=user_id, TaskId=task_id).first()
        
        if not favourite_task:
            return {'message': 'Favourite task not found'}, 404
        
        db.session.delete(favourite_task)
        db.session.commit()
        
        return '', 204
@taskNameSpace.route('/Pinned')
class TasksPinned(Resource):
    @taskNameSpace.doc('MakePinnedTaskForUser')
    @taskNameSpace.expect(TaskUserModel)
    @taskNameSpace.marshal_with(TaskUserModel, code=201)
    def post(self):
        '''Create a new pinned task'''
        data = request.json
        userId = data.get('userId')
        if userId == 0 :
            userId = None
        taskId = data.get('taskId')
        if taskId == 0 :
            taskId = None
        newPinnedTask = PinnedTasks(
            TaskId=data.get('taskId'),
            UserId=data.get('userId')
        )
        db.session.add(newPinnedTask)
        db.session.commit()
        return newPinnedTask.serialize(), 201
    @taskNameSpace.doc('GetPinnedTasksForUser')
    @taskNameSpace.param('userId', 'User ID to fetch pinned tasks')
    @taskNameSpace.param('taskId', 'Task ID to fetch a specific pinned task (optional)')
    def get(self):
        '''Retrieve pinned tasks for a specific user and optionally a specific task'''
        user_id = request.args.get('userId', type=int)
        task_id = request.args.get('taskId', type=int)

        query = PinnedTasks.query
        if user_id:
            query = query.filter_by(UserId=user_id)

        if task_id:  # If taskId is provided, filter further
            query = query.filter_by(TaskId=task_id)

        pinned_tasks = query.all()

        return [task.serialize() for task in pinned_tasks], 200

    @taskNameSpace.doc('RemovePinnedTaskForUser')
    @taskNameSpace.param('userId', 'User ID to remove pinned task for', required=True)
    @taskNameSpace.param('taskId', 'Task ID to remove from pinned', required=True)
    @taskNameSpace.response(204, 'Pinned task removed successfully')
    @taskNameSpace.response(404, 'Pinned task not found')
    def delete(self):
        '''Remove a task from user's pinned tasks'''
        user_id = request.args.get('userId', type=int)
        task_id = request.args.get('taskId', type=int)
        
        if not user_id or not task_id:
            return {'message': 'Both userId and taskId are required'}, 400
        
        pinned_task = PinnedTasks.query.filter_by(UserId=user_id, TaskId=task_id).first()
        
        if not pinned_task:
            return {'message': 'Pinned task not found'}, 404
        
        db.session.delete(pinned_task)
        db.session.commit()
        
        return '', 204
    
@taskNameSpace.route('/<int:task_id>/workspaces')
class WorkspacesForTask(Resource):
    @taskNameSpace.doc('GetWorkspacesForTask')
    def get(self, task_id):
        """Get all workspaces that were created from this task"""
        from models import Workspace
        workspaces = Workspace.query.filter_by(CreatedFromTaskId=task_id).all()
        return [ws.serialize() for ws in workspaces], 200

    @taskNameSpace.doc('CreateWorkspaceFromTask')
    @taskNameSpace.expect(api.model('WorkspaceFromTask', {
        'name': fields.String(required=True, description='Workspace name'),
        'createdBy': fields.Integer(required=True, description='User ID'),
        'folderId': fields.Integer(required=True, description='Folder ID')
    }))
    def post(self, task_id):
        """Create a workspace and link it to the task"""
        from models import Workspace, Task
        from datetime import datetime

        task = Task.query.get_or_404(task_id)
        data = request.json

        new_ws = Workspace(
            Name=data['name'],
            CreatedBy=data['createdBy'],
            FolderId=data['folderId'],
            CreatedFromTask=True,
            CreatedFromTaskId=task.Id,
            CreatedDateTime=datetime.now(),
            LastModifyDateTime=datetime.now()
        )

        db.session.add(new_ws)
        db.session.commit()

        return new_ws.serialize(), 201

@taskNameSpace.route('/today')
class TasksToday(Resource):
    @taskNameSpace.doc('GetTasksForToday')
    @taskNameSpace.marshal_list_with(TaskModel)
    def get(self):
        '''List all tasks for the current date'''
        today = date.today()
        
        # Query tasks where DueDate equals today's date
        tasks = Task.query.filter(Task.DueDate == today).all()
        
        return [task.serialize() for task in tasks]

# Register TaskList and TaskResource resources with the API
taskNameSpace.add_resource(TaskList, '/')
taskNameSpace.add_resource(TaskResource, '/<int:id>')
taskNameSpace.add_resource(TasksByCompany, '/Company/<int:companyId>')
taskNameSpace.add_resource(TasksByWorkspace, '/Workspace/<int:workspaceId>')
taskNameSpace.add_resource(TasksFavourite, '/Favourite')
taskNameSpace.add_resource(TasksPinned, '/Pinned')
taskNameSpace.add_resource(WorkspacesForTask, '/<int:task_id>/workspaces')
taskNameSpace.add_resource(TasksToday, '/today')

api.add_namespace(taskNameSpace)
if __name__ == '__main__':
    app.run(debug=True)
