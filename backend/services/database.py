from sqlalchemy.orm import Session
from ..db import SessionLocal, engine, Base


# This creates the tables in the DB if they don't exist
def create_tables():
    Base.metadata.create_all(bind=engine)


# The Dependency: This ensures the DB connection closes after the request is done
def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
