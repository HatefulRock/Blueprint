import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from .. import models, schemas
from ..services.auth import get_current_user
from ..services.database import get_db

# Setup logger
logger = logging.getLogger("app.templates")

router = APIRouter(prefix="/templates", tags=["templates"])

# --- Helper Utilities ---

def get_template_or_404(db: Session, template_id: str, user_id: str, allow_global: bool = False):
    """
    Utility to fetch a template and verify ownership.
    UUIDs are treated as strings.
    """
    template = db.query(models.CardTemplate).filter(models.CardTemplate.id == template_id).first()
    
    if not template:
        logger.warning(f"Template {template_id} not found")
        raise HTTPException(status_code=404, detail="Template not found")

    # If allow_global is True, we allow the fetch even if user_id is None (system template)
    if allow_global and template.user_id is None:
        return template

    # Check ownership
    if str(template.user_id) != str(user_id):
        logger.warning(f"Unauthorized access attempt to Template {template_id} by User {user_id}")
        raise HTTPException(status_code=403, detail="Access denied to this template")
        
    return template

# --- Endpoints ---

@router.get("/", response_model=List[schemas.CardTemplateRead])
def get_user_templates(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all templates for the current user, including global templates."""
    try:
        templates = db.query(models.CardTemplate).filter(
            (models.CardTemplate.user_id == current_user.id) |
            (models.CardTemplate.user_id == None)
        ).all()
        return templates
    except SQLAlchemyError as e:
        logger.error(f"Error fetching templates for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error while fetching templates")


@router.post("/", response_model=schemas.CardTemplateRead)
def create_template(
    template_data: schemas.CardTemplateCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new card template for the current user."""
    try:
        new_template = models.CardTemplate(
            user_id=current_user.id,
            name=template_data.name,
            language=template_data.language,
            front_template=template_data.front_template,
            back_template=template_data.back_template
        )
        db.add(new_template)
        db.commit()
        db.refresh(new_template)
        logger.info(f"User {current_user.id} created template: {new_template.id}")
        return new_template
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Failed to create template: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error during template creation")


@router.patch("/{template_id}", response_model=schemas.CardTemplateRead)
def update_template(
    template_id: str,
    template_data: schemas.CardTemplateUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing private template."""
    # Ensure template exists and belongs to user (Global templates cannot be updated via this route)
    template = get_template_or_404(db, template_id, current_user.id)

    update_fields = template_data.dict(exclude_unset=True)
    if not update_fields:
        return template

    try:
        for key, value in update_fields.items():
            setattr(template, key, value)

        db.commit()
        db.refresh(template)
        logger.info(f"Template updated: {template_id} by user {current_user.id}")
        return template
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Failed to update template {template_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Update failed")


@router.delete("/{template_id}")
def delete_template(
    template_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a template owned by the user."""
    template = get_template_or_404(db, template_id, current_user.id)

    try:
        db.delete(template)
        db.commit()
        logger.info(f"Template deleted: {template_id} by user {current_user.id}")
        return {"message": "Template deleted"}
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Failed to delete template {template_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Delete failed")


@router.get("/{template_id}/preview")
def preview_template(
    template_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Preview a template (private or global) with sample data."""
    # allow_global=True because users should be able to preview system templates
    template = get_template_or_404(db, template_id, current_user.id, allow_global=True)

    # Sample data for preview
    sample_data = {
        "term": "你好",
        "translation": "Hello",
        "context": "你好，很高兴见到你。",
        "literal_translation": "you-good",
        "part_of_speech": "interjection",
        "grammatical_breakdown": "你 (you) + 好 (good)"
    }

    # Render logic
    # NOTE: If using Jinja2 in CardService, consider using that service here instead.
    front = template.front_template
    back = template.back_template

    try:
        for key, value in sample_data.items():
            placeholder = f"{{{{{key}}}}}"  # Matches {{term}} format
            front = front.replace(placeholder, value)
            back = back.replace(placeholder, value)

        return {
            "front": front,
            "back": back,
            "template": {
                "id": template.id,
                "name": template.name
            }
        }
    except Exception as e:
        logger.error(f"Preview rendering failed for template {template_id}: {str(e)}")
        raise HTTPException(status_code=400, detail="Template rendering error")