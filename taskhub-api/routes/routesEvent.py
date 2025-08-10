from datetime import datetime
from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields
from sqlalchemy import or_
from app import app, db, api, eventNameSpace
from models import Event, User, UserEvents

UserEventModel = eventNameSpace.model('UserEvent', {
    'userId': fields.Integer(description="The ID of the user"),
    'eventId': fields.Integer(description="The id of event"),
})

EventModel = eventNameSpace.model('Event', {
    'id': fields.Integer(readOnly=True, description='The event unique identifier'),
    'title': fields.String(required=True, description='The event title'),
    'location': fields.String(required=True, description='The event location'),
    'createdBy': fields.Integer(required=True,description='The event created by id'),
    'createdDateTime': fields.DateTime(description='The event created date time'),
    'createdByUser': fields.String(description='The user that create event'),
    'dateTimeFrom': fields.DateTime(description='The event date time from'),
    'dateTimeTo': fields.DateTime(description='The event date time to'),
    'userEmails': fields.String(description='The event user emails') ,
    'userEvents': fields.List(fields.Nested(UserEventModel),description='The event user emails'),
    'color': fields.String(description="The color of the event"),
    'description': fields.String(description="The description of the event"),
    'allDay': fields.Boolean(description="The all day event"),
    'frequency': fields.String(description="The frequency of the event")
})

# Resource for managing events
@eventNameSpace.route('/')
class Events(Resource):
    @eventNameSpace.doc('ListEvents')
    @eventNameSpace.marshal_list_with(EventModel)
    def get(self):
        """List all events"""
        events = Event.query.all()
        return [event.serialize() for event in events]

    @eventNameSpace.doc('CreateEvent')
    @eventNameSpace.expect(EventModel)
    @eventNameSpace.marshal_with(EventModel, code=201)
    def post(self):
        """Create a new event"""
        data = request.json
        user_events = []
        if 'userEvents' in data:
            for user_data in data['userEvents']:
                user_event = UserEvents(
                    UserId=user_data['userId']
                )
            user_events.append(user_event)
        newEvent = Event(
            Title=data['title'],
            Location=data['location'],
            CreatedBy=data.get('createdBy'),
            CreatedDateTime=datetime.now(),
            DateTimeFrom=data.get('dateTimeFrom'),
            DateTimeTo=data.get('dateTimeTo'),
            UserEmails=data.get('userEmails'),
            EventUsers=user_events,
            Color=data.get('color'),
            Description=data.get('description'),
            AllDay=data.get('allDay'),
            Frequency=data.get('frequency')
        )
        db.session.add(newEvent)
        db.session.commit()
        return newEvent.serialize(), 201

# add endpoint to get all Event by companyId
@eventNameSpace.route('/<int:id>')
@eventNameSpace.response(404, 'Event not found')
@eventNameSpace.param('id', 'The Event identifier')
class EventResource(Resource):
    @eventNameSpace.doc('GetEvent')
    @eventNameSpace.marshal_with(EventModel)
    def get(self, id):
        """Fetch a Event given its identifier"""
        event = Event.query.get_or_404(id)
        return event.serialize()

    @eventNameSpace.doc('UpdateEvent')
    @eventNameSpace.expect(EventModel)
    @eventNameSpace.marshal_with(EventModel)
    def put(self, id):
        """Update a Event given its identifier"""
        event = Event.query.get_or_404(id)
        data = request.json
        user_events = []
        if 'userEvents' in data:
            for user_data in data['userEvents']:
                user_event = UserEvents(
                    UserId=user_data['userId']
                )
            user_events.append(user_event)
        event.Title = data.get('title', event.Title)
        event.Location = data.get('location', event.Location)
        event.UserEmails = data.get('userEmails', event.UserEmails)
        event.CreatedBy = data.get('createdBy', event.CreatedBy)
        event.DateTimeFrom = data.get('dateTimeFrom', event.DateTimeFrom)
        event.DateTimeTo = data.get('dateTimeTo', event.DateTimeTo)
        event.EventUsers = user_events
        event.Color = data.get('color', event.Color)
        event.Description = data.get('description', event.Description)
        event.AllDay = data.get('allDay', event.AllDay)
        event.Frequency = data.get('frequency', event.Frequency)
        db.session.commit()
        return event.serialize()

    @eventNameSpace.doc('DeleteEvent')
    @eventNameSpace.response(204, 'Event deleted')
    def delete(self, id):
        """Delete a Event given its identifier"""
        event = Event.query.get_or_404(id)
        db.session.delete(event)
        db.session.commit()
        return '', 204

@eventNameSpace.route('/Upcoming')
@eventNameSpace.response(404, 'No upcoming events found')
class UpcomingEvents(Resource):
    @eventNameSpace.doc('GetUpcomingEvents')
    @eventNameSpace.marshal_list_with(EventModel)
    def get(self):
        """List all upcoming events (events that haven't started yet or are currently active)"""
        current_time = datetime.now()
        # Get events that haven't ended yet (DateTimeTo >= current_time)
        # This includes events that haven't started yet and events currently happening
        events = Event.query.filter(Event.DateTimeTo >= current_time).order_by(Event.DateTimeFrom.asc()).all()
        
        return [event.serialize() for event in events]

@eventNameSpace.route('/User/<int:userId>')
@eventNameSpace.response(404, 'No events found for this user')
@eventNameSpace.param('userId', 'The user identifier')
class EventsByUser(Resource):
    @eventNameSpace.doc('GetEventsByUser')
    @eventNameSpace.marshal_list_with(EventModel)
    def get(self, userId):
        """List all events filtered by user ID"""
        events = Event.query.outerjoin(UserEvents, Event.Id == UserEvents.EventId).filter(or_(UserEvents.UserId == userId, Event.CreatedBy == userId)).all()

        if not events:
            eventNameSpace.abort(404, "No events found for this user")
        return [event.serialize() for event in events]

# Add resources to namespace
eventNameSpace.add_resource(Events, '/')
eventNameSpace.add_resource(EventResource, '/<int:id>')
eventNameSpace.add_resource(UpcomingEvents, '/Upcoming')
eventNameSpace.add_resource(EventsByUser, '/User/<int:userId>')
api.add_namespace(eventNameSpace)
if __name__ == '__main__':
    app.run(debug=True)
