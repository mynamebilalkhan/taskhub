from app import db, DB_URI, app
from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
class Vault(db.Model):
    __tablename__ = 'vaults'
    Id = Column(Integer, primary_key=True)
    Name = Column(String)
    CreatedBy = Column(Integer, ForeignKey('users.Id'))
    CreatedDateTime = Column(DateTime)
    LastModifyDateTime = Column(DateTime)
    
    CreatedByUser = relationship('User', foreign_keys=[CreatedBy], back_populates='VaultsCreated', overlaps="VaultsCreated")
    Collaborations = relationship('Collaboration', back_populates='Vault', overlaps="Collaborations")

    def serialize(self):
        if self.Collaborations:
            distinct_user_ids = {c.UserId for c in self.Collaborations}
            num_users = len(distinct_user_ids)
        else:
            num_users = 0
        return {
            'id': self.Id,
            'name': self.Name,
            'createdBy': self.CreatedBy,
            'createdByName': self.CreatedByUser.getfullname() if self.CreatedByUser else "",
            'createdDateTime': self.CreatedDateTime.isoformat() if self.CreatedDateTime else None,
            'lastModifyDateTime': self.LastModifyDateTime.isoformat() if self.LastModifyDateTime else None,
            'numOfUsers': num_users
        }
class Event(db.Model):
    __tablename__ = 'events'
    Id = Column(Integer, primary_key=True)
    Title = Column(String)
    CreatedBy = Column(Integer, ForeignKey('users.Id'))
    CreatedDateTime = Column(DateTime)
    DateTimeFrom = Column(DateTime)
    DateTimeTo = Column(DateTime)
    Location = Column(String)
    UserEmails = Column(String)

    CreatedByUser = relationship('User', foreign_keys=[CreatedBy], back_populates='EventsCreated', overlaps="EventsCreated")
    EventUsers = relationship('UserEvents', back_populates='Event', cascade="all, delete-orphan")
    def serialize(self):
        return {
            'id': self.Id,
            'title': self.Title,
            'createdBy': self.CreatedBy,
            'createdByUser': self.CreatedByUser.getfullname() if self.CreatedByUser else "",
            'createdDateTime': self.CreatedDateTime.isoformat() if self.CreatedDateTime else None,
            'dateTimeFrom': self.DateTimeFrom.isoformat() if self.DateTimeFrom else None,
            'dateTimeTo': self.DateTimeTo.isoformat() if self.DateTimeTo else None,
            'userEmails': self.UserEmails,
            'location': self.Location,
            'userEvents': [user_event.serialize() for user_event in self.EventUsers] if self.EventUsers else None
        }
class UserEvents(db.Model):
    __tablename__ = 'userevents'
    Id = Column(Integer, primary_key=True)
    EventId = Column(Integer, ForeignKey('events.Id'), nullable=False)
    UserId = Column(Integer, ForeignKey('users.Id'), nullable=False)

    Event = relationship('Event', foreign_keys=[EventId], back_populates='EventUsers')
    User = relationship('User', foreign_keys=[UserId], back_populates='UserEvents')

    def serialize(self):
        return {
            'id': self.Id,
            'eventId': self.EventId,
            'userId': self.UserId,
            'user': self.User.getfullname() if self.User else ""
        }    
class Task(db.Model):
    __tablename__ = 'tasks'
    Id = Column(Integer, primary_key=True)
    Title = Column(String)
    Description = Column(String)
    DueDate = Column(Date)
    Status = Column(String)
    Priority = Column(String)
    Industry = Column(String)
    AssignedTo = Column(Integer, ForeignKey('users.Id'))
    CreatedBy = Column(Integer, ForeignKey('users.Id'))
    CreatedDateTime = Column(DateTime)
    LastModifyDateTime = Column(DateTime)
    ParentId = Column(Integer, ForeignKey('tasks.Id'), nullable=True)
    PageId = Column(Integer, ForeignKey('pages.Id'))
   


    AssignedUser = relationship('User', foreign_keys=[AssignedTo], back_populates='TasksAssigned', overlaps="TasksAssigned")
    CreatedByUser = relationship('User', foreign_keys=[CreatedBy], back_populates='TasksCreated', overlaps="TasksCreated")
    ParentTask = relationship('Task', remote_side=[Id], back_populates='ChildTasks')
    ChildTasks = relationship('Task', back_populates='ParentTask')
    Page = relationship('Page', back_populates='Tasks')
    GeneratedWorkspace = relationship('Workspace', foreign_keys='Workspace.CreatedFromTaskId', backref='GeneratedFromTask', uselist=False)

    def serialize(self):
        return {
            'id': self.Id,
            'title': self.Title,
            'dueDate': self.DueDate.isoformat() if self.DueDate else None,
            'status': self.Status,
            'priority': self.Priority,
            'assignedTo': 0 if self.AssignedTo is None else self.AssignedTo,
            'assignedToName': self.AssignedUser.getfullname() if self.AssignedUser else "",
            'createdBy': self.CreatedBy,
            'createdByName': self.CreatedByUser.getfullname() if self.CreatedByUser else "",
            'createdDateTime': self.CreatedDateTime.isoformat() if self.CreatedDateTime else None,
            'lastModifyDateTime': self.LastModifyDateTime.isoformat() if self.LastModifyDateTime else None,
            'parentId': self.ParentId,
            'pageId': self.PageId,
            'pageName': self.Page.Name if self.Page else None,
            'description': self.Description,
            'industry': self.Industry
        }
class Workspace(db.Model):
    __tablename__ = 'workspaces'
    Id = Column(Integer, primary_key=True)
    Name = Column(String)
    CreatedBy = Column(Integer, ForeignKey('users.Id'))
    CreatedDateTime = Column(DateTime)
    LastModifyDateTime = Column(DateTime)
    FolderId = Column(Integer, ForeignKey('folders.Id'))
    CreatedFromTask = Column(Boolean, default=False)
    CreatedFromTaskId = Column(Integer, ForeignKey('tasks.Id'), nullable=True)
    CreatedFromCardId = Column(Integer, ForeignKey('cards.Id'), nullable=True)

    CreatedFromCardRef = relationship('Card', foreign_keys=[CreatedFromCardId])
    CreatedFromTaskRef = relationship('Task', foreign_keys=[CreatedFromTaskId])
    CreatedByUser = relationship('User', foreign_keys=[CreatedBy], overlaps='CreatedByUser')
    Folder = relationship('Folder', back_populates='Workspaces')
    Pages = relationship('Page', back_populates='Workspace')

    def serialize(self):
        return {
            'id': self.Id,
            'name': self.Name,
            'createdBy': self.CreatedBy,
            'createdByUser': self.CreatedByUser.getfullname() if self.CreatedByUser else "",
            'createdDateTime': self.CreatedDateTime.isoformat() if self.CreatedDateTime else None,
            'lastModifyDateTime': self.LastModifyDateTime.isoformat() if self.LastModifyDateTime else None,
            'folderId': self.FolderId,
            'folderName': None if self.Folder is None else self.Folder.Name ,
            'createdFromTask': self.CreatedFromTask,
            'createdFromTaskId': self.CreatedFromTaskId,
            'createdFromCardId': self.CreatedFromCardId        
        }
class Folder(db.Model):
    __tablename__ = 'folders'
    Id = Column(Integer, primary_key=True)
    Name = Column(String)
    CreatedBy = Column(Integer, ForeignKey('users.Id'))
    CreatedDateTime = Column(DateTime)
    ParentId = Column(Integer, ForeignKey('folders.Id'), nullable=True)
    VaultId = Column(Integer, ForeignKey('vaults.Id'), nullable=True)

    CreatedByUser = relationship('User', foreign_keys=[CreatedBy])
    Files = relationship('File', back_populates='Folder')  
    ParentFolder = relationship('Folder', remote_side=[Id], back_populates='ChildFolders')
    ChildFolders = relationship('Folder', back_populates='ParentFolder') 
    Workspaces = relationship('Workspace', back_populates='Folder')  
    Urls = relationship('Url', back_populates='Folder', cascade='all, delete-orphan')

    def serialize(self):
        return {
            'id': self.Id,
            'name': self.Name,
            'createdBy': self.CreatedBy,
            'createdByUser' : self.CreatedByUser.getfullname() if self.CreatedByUser else "",
            'createdDateTime': self.CreatedDateTime.isoformat() if self.CreatedDateTime else None,
            'parentId' : 0 if self.ParentId is None else self.ParentId,
            'parentName' : None if self.ParentFolder is None else self.ParentFolder.Name,
            'vaultId' : self.VaultId
        }
class TextBox(db.Model):
    __tablename__ = 'textbox'
    Id = Column(Integer, primary_key=True)
    Text = Column(Text)
    CreatedBy = Column(Integer, ForeignKey('users.Id'))
    CreatedDateTime = Column(DateTime)
    LastModifyDateTime = Column(DateTime)
    PageId = Column(Integer, ForeignKey('pages.Id'))
    OrderIndex = Column(Integer)

    Page = relationship('Page', back_populates='TextBoxes')
    CreatedByUser = relationship('User', foreign_keys=[CreatedBy], back_populates='TextBoxesCreated', overlaps="TextBoxesCreated")

    def serialize(self):
        return {
            'id': self.Id,
            'text': self.Text,
            'pageId': self.PageId,
            'pageName': self.Page.Name if self.Page else None,
            'createdBy': self.CreatedBy,
            'createdByUser': self.CreatedByUser.getfullname() if self.CreatedByUser else "",
            'createdDateTime': self.CreatedDateTime.isoformat() if self.CreatedDateTime else None,
            'lastModifyDateTime': self.LastModifyDateTime.isoformat() if self.LastModifyDateTime else None,
            'orderIndex' : self.OrderIndex
        }
class File(db.Model):
    __tablename__ = 'files'
    Id = Column(Integer, primary_key=True)
    Name = Column(String)
    Path = Column(String)
    FolderId = Column(Integer, ForeignKey('folders.Id'), nullable=True)
    PageId = Column(Integer, ForeignKey('pages.Id'), nullable=True)
    CreatedBy = Column(Integer, ForeignKey('users.Id'))
    CreatedDateTime = Column(DateTime)
    Iso265File = Column(Boolean)
    Folder = relationship('Folder', back_populates='Files')
    Page = relationship('Page', back_populates='Files')
    CreatedByUser = relationship('User', foreign_keys=[CreatedBy], back_populates='FilesCreated', overlaps="FilesCreated")

    def serialize(self):
        return {
            'id': self.Id,
            'name': self.Name,
            'path': self.Path,
            'folderId': self.FolderId,
            'pageId': self.PageId,
            'createdBy': self.CreatedBy,
            'createdByUser': self.CreatedByUser.getfullname() if self.CreatedByUser else "",
            'createdDateTime': self.CreatedDateTime.isoformat() if self.CreatedDateTime else None,
            'iso365File': self.Iso265File
        }
class Url(db.Model):
    __tablename__ = 'urls'
    Id = Column(Integer, primary_key=True)
    Name = Column(String)
    Url = Column(String)
    CreatedBy = Column(Integer, ForeignKey('users.Id'))
    CreatedDateTime = Column(DateTime)
    FolderId = Column(Integer, ForeignKey('folders.Id'), nullable=False)

    Folder   = relationship('Folder', back_populates='Urls')
    CreatedByUser = relationship('User', foreign_keys=[CreatedBy])

    def serialize(self):
        return {
            'id': self.Id,
            'name': self.Name,
            'url': self.Url,
            'folderId': self.FolderId,
            'createdBy': self.CreatedBy,
            'createdByUser': self.CreatedByUser.getfullname() if self.CreatedByUser else "",
            'createdDateTime': self.CreatedDateTime.isoformat() if self.CreatedDateTime else None
        }    
class Collaboration(db.Model):
    __tablename__ = 'collaborations'
    Id = Column(Integer, primary_key=True)
    VaultId = Column(Integer, ForeignKey('vaults.Id'), nullable=True)
    UserId = Column(Integer, ForeignKey('users.Id'))
    FolderId = Column(Integer, ForeignKey('folders.Id'), nullable=True)
    WorkspaceId = Column(Integer, ForeignKey('workspaces.Id'), nullable=True)
    FileId = Column(Integer, ForeignKey('files.Id'), nullable=True)
    PermissionType = Column(String, nullable=True)

    Folder = relationship('Folder', backref='Collaborations', foreign_keys=[FolderId])
    Workspace = relationship('Workspace', backref='Collaborations', foreign_keys=[WorkspaceId])
    File = relationship('File', backref='Collaborations', foreign_keys=[FileId])
    Vault = relationship('Vault', back_populates='Collaborations')
    User = relationship('User', foreign_keys=[UserId], back_populates='Collaborations', overlaps="Collaborations")

    def serialize(self):
        return {
            'id': self.Id,
            'vaultId': self.VaultId,
            'userId': self.UserId,
            'folderId': self.FolderId,
            'workspaceId': self.WorkspaceId,
            'fileId': self.FileId,
            'permissionType':self.PermissionType,
            'userFullName': self.User.getfullname() if self.User else ""
        }
class FavoriteTasks(db.Model):
    __tablename__ = 'favoritetasks'
    Id = Column(Integer, primary_key=True)
    TaskId = Column(Integer, ForeignKey('tasks.Id'), nullable=True)
    UserId = Column(Integer, ForeignKey('users.Id'))

    Task = relationship('Task', foreign_keys=[TaskId])
    User = relationship('User', foreign_keys=[UserId], back_populates='FavouritesTasks', overlaps="FavouritesTasks")

    def serialize(self):
        return {
            'id': self.Id,
            'taskId': self.TaskId,
            'userId': self.UserId,
            'user': self.User.getfullname() if self.User else ""
        }
class PinnedTasks(db.Model):
    __tablename__ = 'pinnedtasks'
    Id = Column(Integer, primary_key=True)
    TaskId = Column(Integer, ForeignKey('tasks.Id'), nullable=True)
    UserId = Column(Integer, ForeignKey('users.Id'))

    Task = relationship('Task', foreign_keys=[TaskId])
    User = relationship('User', foreign_keys=[UserId], back_populates='PinnedTasks', overlaps="PinnedTasks")

    def serialize(self):
        return {
            'id': self.Id,
            'taskId': self.TaskId,
            'userId': self.UserId,
            'user': self.User.getfullname() if self.User else ""
        }
class User(db.Model):
    __tablename__ = 'users'
    Id = Column(Integer, primary_key=True)
    Username = Column(String)
    Password = Column(String)
    FirstName = Column(String)
    LastName = Column(String)
    Role = Column(String)
    ExternalUsername = Column(String)
    PaymentPlan = Column(Integer)
    PaymentDateTime = Column(DateTime)
    CreatedDateTime = Column(DateTime)
    CompanyId = Column(Integer, ForeignKey('companies.Id'))

    TasksAssigned = relationship('Task', foreign_keys=[Task.AssignedTo], back_populates='AssignedUser', overlaps="TasksAssigned")
    TasksCreated = relationship('Task', foreign_keys=[Task.CreatedBy], back_populates='CreatedByUser', overlaps="TasksCreated")
    VaultsCreated = relationship('Vault', foreign_keys=[Vault.CreatedBy], back_populates='CreatedByUser', overlaps="VaultsCreated")
    EventsCreated = relationship('Event', foreign_keys=[Event.CreatedBy], back_populates='CreatedByUser', overlaps="EventsCreated")
    FilesCreated = relationship('File', foreign_keys=[File.CreatedBy], back_populates='CreatedByUser', overlaps="FilesCreated")
    TextBoxesCreated = relationship('TextBox', foreign_keys=[TextBox.CreatedBy], back_populates='CreatedByUser', overlaps="TextBoxesCreated")
    Collaborations = relationship('Collaboration', foreign_keys=[Collaboration.UserId], back_populates='User', overlaps="Collaborations")
    Company = relationship('Company', back_populates='Users')
    FavouritesTasks = relationship('FavoriteTasks', foreign_keys=[FavoriteTasks.UserId], overlaps="FavouritesTasks")
    PinnedTasks = relationship('PinnedTasks', foreign_keys=[PinnedTasks.UserId], overlaps="PinnedTasks")
    UserEvents = relationship('UserEvents', back_populates='User', cascade="all, delete-orphan")

    def serialize(self):
        return {
            'id': self.Id,
            'username': self.Username,
            'role': self.Role,
            'firstName': self.FirstName,
            'lastName': self.LastName,
            'createdDateTime': self.CreatedDateTime.isoformat() if self.CreatedDateTime else None,
            'companyId': self.CompanyId,
            'company': self.Company.Name,
            'paymentPlan': self.PaymentPlan,
            'paymentDateTime': self.PaymentDateTime.isoformat() if self.PaymentDateTime else None,
            'fullName' : self.getfullname() if self else "",
            'externalUsername' : self.ExternalUsername
        }
    def getfullname(self):
        if self.FirstName is None and self.LastName is None:
            return ""
        elif self.FirstName is None:
            return self.LastName
        elif self.LastName is None:
            return self.FirstName
        else:
            return f"{self.FirstName} {self.LastName}"
class Company(db.Model):
    __tablename__ = 'companies'
    Id = Column(Integer, primary_key=True)
    Name = Column(String)
    ApplicationId = Column(String)
    TenantId = Column(String)
    ClientSecret = Column(String)
    Users = relationship('User', back_populates='Company')

    def serialize(self):
        return {
            'id': self.Id,
            'name': self.Name,
            'clientSecret': self.ClientSecret,
            'applicationId': self.ApplicationId,
            'tenantId': self.TenantId
        }

class Page(db.Model):
    __tablename__ = 'pages'
    Id = Column(Integer, primary_key=True)
    Name = Column(String)
    WorkspaceId = Column(Integer, ForeignKey('workspaces.Id'))
    CreatedBy = Column(Integer, ForeignKey('users.Id'))
    CreatedDateTime = Column(DateTime)
    LastModifyDateTime = Column(DateTime)
    OrderIndex = Column(Integer)

    Workspace = relationship('Workspace', back_populates='Pages')
    CreatedByUser = relationship('User')
    Tasks = relationship('Task', back_populates='Page')
    TextBoxes = relationship('TextBox', back_populates='Page')
    Cards = relationship('Card', back_populates='Page')
    Images = relationship('Image', back_populates='Page')
    Files = relationship('File', back_populates='Page')

    def serialize(self):
        return {
            'id': self.Id,
            'name': self.Name,
            'workspaceId': self.WorkspaceId,
            'createdBy': self.CreatedBy,
            'createdByUser': self.CreatedByUser.getfullname() if self.CreatedByUser else "",
            'createdDateTime': self.CreatedDateTime.isoformat() if self.CreatedDateTime else None,
            'lastModifyDateTime': self.LastModifyDateTime.isoformat() if self.LastModifyDateTime else None,
            'vaultId': self.Workspace.Folder.VaultId,
            'orderIndex': self.OrderIndex
        }
    
class Card(db.Model):
    __tablename__ = 'cards'
    Id = Column(Integer, primary_key=True)
    Name = Column(String) 
    Description = Column(String)
    Status = Column(String)
    Priority = Column(String)
    Category = Column(String)
    DueDate = Column(Date)
    AssignedTo = Column(Integer, ForeignKey('users.Id'), nullable=True) 
    CreatedBy = Column(Integer, ForeignKey('users.Id'))
    CreatedDateTime = Column(DateTime)
    LastModifyDateTime = Column(DateTime)
    PageId = Column(Integer, ForeignKey('pages.Id'))
    X = Column(Float, nullable=True, default=0.0)
    Y = Column(Float, nullable=True, default=0.0)
    Page = relationship('Page', back_populates='Cards')
    AssignedUser = relationship('User', foreign_keys=[AssignedTo])
    CreatedByUser = relationship('User', foreign_keys=[CreatedBy])
    GeneratedWorkspace = relationship('Workspace', foreign_keys='Workspace.CreatedFromCardId', backref='GeneratedFromCard', uselist=False)

    def serialize(self):
        return {
            'id': self.Id,
            'name': self.Name,
            'description': self.Description,
            'status': self.Status,
            'priority': self.Priority,
            'category': self.Category,
            'dueDate': self.DueDate.isoformat() if self.DueDate else None,
            'assignedTo': self.AssignedTo,
            'assignedToName': self.AssignedUser.getfullname() if self.AssignedUser else "",
            'createdBy': self.CreatedBy,
            'createdByUser': self.CreatedByUser.getfullname() if self.CreatedByUser else "",
            'createdDateTime': self.CreatedDateTime.isoformat() if self.CreatedDateTime else None,
            'lastModifyDateTime': self.LastModifyDateTime.isoformat() if self.LastModifyDateTime else None,
            'pageId': self.PageId,
            'workspaceId': self.GeneratedWorkspace.Id if self.GeneratedWorkspace else 0,
            'x': self.X,
            'y': self.Y
        }
class CardConnection(db.Model):
    __tablename__ = 'card_connections'
    Id = Column(Integer, primary_key=True)
    FromCardId = Column(Integer, ForeignKey('cards.Id'), nullable=False)
    ToCardId = Column(Integer, ForeignKey('cards.Id'), nullable=False)

    FromCard = relationship('Card', foreign_keys=[FromCardId], backref='ConnectionsFrom')
    ToCard = relationship('Card', foreign_keys=[ToCardId], backref='ConnectionsTo')

    def serialize(self):
        return {
            'id': self.Id,
            'fromCardId': self.FromCardId,
            'toCardId': self.ToCardId
        }
    
class Image(db.Model):
    __tablename__ = 'images'
    Id = Column(Integer, primary_key=True)
    Name = Column(String)
    Base64Data = Column(Text)
    PageId = Column(Integer, ForeignKey('pages.Id'))
    CreatedBy = Column(Integer, ForeignKey('users.Id'))
    CreatedDateTime = Column(DateTime)
    LastModifyDateTime = Column(DateTime)
    OrderIndex = Column(Integer)

    Page = relationship('Page', foreign_keys=[PageId])
    CreatedByUser = relationship('User', foreign_keys=[CreatedBy])

    def serialize(self):
        return {
            'id': self.Id,
            'name': self.Name,
            'base64': self.Base64Data,
            'pageId': self.PageId,
            'pageName': self.Page.Name if self.Page else None,
            'createdBy': self.CreatedBy,
            'createdByUser': self.CreatedByUser.getfullname() if self.CreatedByUser else "",
            'createdDateTime': self.CreatedDateTime.isoformat() if self.CreatedDateTime else None,
            'lastModifyDateTime': self.LastModifyDateTime.isoformat() if self.LastModifyDateTime else None,
            'orderIndex' : self.OrderIndex
        }