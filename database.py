# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from typing import Generator

# NOTE: This uses the credentials confirmed from your pgAdmin session.
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:ayesha123@localhost/Recipe_manager_db"

# 1. Create the SQLAlchemy Engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 2. Create a SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Create a Custom Base Class for SQLAlchemy Models
class Base(DeclarativeBase):
    pass

# 4. Dependency to get a database session (for FastAPI)
def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()