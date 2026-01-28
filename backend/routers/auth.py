from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from services.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
)
from services.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.Token)
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user or set password for legacy user.

    If username exists but has no password (legacy user), allow password setup.
    """
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        models.User.username == user_data.username
    ).first()

    if existing_user:
        if existing_user.hashed_password:
            # User already has a password
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered. Please login."
            )
        else:
            # Legacy user - allow password setup
            existing_user.hashed_password = get_password_hash(user_data.password)
            if user_data.email:
                existing_user.email = user_data.email
            db.commit()
            db.refresh(existing_user)

            # Create and return token
            access_token = create_access_token(
                data={"user_id": existing_user.id, "username": existing_user.username}
            )

            return schemas.Token(
                token=access_token,
                token_type="bearer",
                id=existing_user.id,
                username=existing_user.username
            )

    # Create new user
    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create access token
    access_token = create_access_token(
        data={"user_id": new_user.id, "username": new_user.username}
    )

    return schemas.Token(
        token=access_token,
        token_type="bearer",
        id=new_user.id,
        username=new_user.username
    )


@router.post("/login", response_model=schemas.Token)
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = authenticate_user(db, user_data.username, user_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = create_access_token(
        data={"user_id": user.id, "username": user.username}
    )

    return schemas.Token(
        token=access_token,
        token_type="bearer",
        id=user.id,
        username=user.username
    )
