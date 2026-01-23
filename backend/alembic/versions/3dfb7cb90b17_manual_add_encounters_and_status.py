"""manual add encounters and status

Revision ID: 3dfb7cb90b17
Revises: f76b90d09164
Create Date: 2026-01-21 16:42:00.117667

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3dfb7cb90b17"
down_revision: Union[str, None] = "d571c413d6c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Manually add the missing columns
    op.add_column(
        "words",
        sa.Column("encounters", sa.Integer(), server_default="0", nullable=True),
    )
    op.add_column(
        "words",
        sa.Column("status", sa.String(length=30), server_default="new", nullable=True),
    )


def downgrade() -> None:
    op.drop_column("words", "status")
    op.drop_column("words", "encounters")
