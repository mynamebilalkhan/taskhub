from app import app, db, DB_URI
from sqlalchemy import create_engine
from sqlalchemy_utils import database_exists, create_database


def run_migrations():
    # Ensure all migrations are up to date
    with app.app_context():
        # Apply any pending migrations
        from flask_migrate import upgrade
        upgrade()
engine = create_engine(DB_URI)
if not database_exists(engine.url):
    create_database(engine.url)
    run_migrations()
else:
    # Connect the database if exists.
    engine.connect() 
    run_migrations()   


