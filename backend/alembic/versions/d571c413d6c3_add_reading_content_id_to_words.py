"""add reading_content_id to words

Revision ID: d571c413d6c3
Revises: d57b2780546e
Create Date: 2026-01-21 16:31:13.153708

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d571c413d6c3"
down_revision: Union[str, None] = "d57b2780546e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if the column exists before adding to avoid errors if partially run
    op.add_column("words", sa.Column("reading_content_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_words_reading_content",
        "words",
        "reading_content",
        ["reading_content_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_words_reading_content", "words", type_="foreignkey")
    op.drop_column("words", "reading_content_id")
