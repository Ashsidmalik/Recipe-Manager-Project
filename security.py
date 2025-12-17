from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Generator

# FIX: Use absolute imports
import models, schemas, crud
from database import get_db

# --- Configuration ---
SECRET_KEY = "YOUR_SUPER_SECRET_KEY_REPLACE_ME" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# FIX: Use compatible sha256_crypt scheme
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

# --- OAuth2 Scheme for FastAPI ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# --- Password Utilities ---

def verify_password(plain_password, hashed_password):
    """Verifies a plain password against a hash."""
    # FIX: Explicitly cast to string for robust compatibility
    return pwd_context.verify(str(plain_password), hashed_password)

def get_password_hash(password):
    """Generates a hash for a given password."""
    # FIX: Explicitly cast to string for robust compatibility
    return pwd_context.hash(str(password))

# --- JWT Token Utilities ---

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Creates a signed JWT token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Dependency to Get Current User ---

def get_current_user(
    db: Session = Depends(get_db), 
    token: str = Depends(oauth2_scheme)
) -> models.User:
    """
    Decodes the JWT token and fetches the corresponding User object.
    Raises 401 Unauthorized if token is invalid or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # The 'sub' field should contain the user's email
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception

    # Fetch the user from the database
    user = crud.get_user_by_email(db, email=token_data.email)
    
    if user is None:
        raise credentials_exception
        
    return user