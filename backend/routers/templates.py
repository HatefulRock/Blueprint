from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..services.auth import get_current_user
from ..services.database import get_db

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/", response_model=List[schemas.CardTemplateRead])
def get_user_templates(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all templates for the current user, including global templates."""
    # Get user's custom templates and global templates (user_id = null)
    templates = db.query(models.CardTemplate).filter(
        (models.CardTemplate.user_id == current_user.id) |
        (models.CardTemplate.user_id == None)
    ).all()
    return templates


@router.post("/", response_model=schemas.CardTemplateRead)
def create_template(
    template_data: schemas.CardTemplateCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new card template for the current user."""
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
    return new_template


@router.patch("/{template_id}", response_model=schemas.CardTemplateRead)
def update_template(
    template_id: int,
    template_data: schemas.CardTemplateUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing template."""
    template = db.query(models.CardTemplate).filter(
        models.CardTemplate.id == template_id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check ownership (can't edit global templates)
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot edit this template")

    # Update fields
    if template_data.name is not None:
        template.name = template_data.name
    if template_data.language is not None:
        template.language = template_data.language
    if template_data.front_template is not None:
        template.front_template = template_data.front_template
    if template_data.back_template is not None:
        template.back_template = template_data.back_template

    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a template."""
    template = db.query(models.CardTemplate).filter(
        models.CardTemplate.id == template_id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check ownership
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete this template")

    db.delete(template)
    db.commit()
    return {"message": "Template deleted"}


@router.get("/{template_id}/preview")
def preview_template(
    template_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Preview a template with sample data."""
    template = db.query(models.CardTemplate).filter(
        models.CardTemplate.id == template_id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Sample data for preview
    sample_data = {
        "term": "你好",
        "translation": "Hello",
        "context": "你好，很高兴见到你。",
        "literal_translation": "you-good",
        "part_of_speech": "interjection",
        "grammatical_breakdown": "你 (you) + 好 (good)"
    }

    # Render templates with sample data
    front = template.front_template
    back = template.back_template

    for key, value in sample_data.items():
        front = front.replace(f"{{{key}}}", value)
        back = back.replace(f"{{{key}}}", value)

    return {
        "front": front,
        "back": back,
        "template": template
    }
