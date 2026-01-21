"""added lots of columns

Revision ID: 519e7790df5e
Revises:
Create Date: 2026-01-20 18:09:00.293021

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "519e7790df5e"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new tables/columns for phased rollout
    op.create_table(
        "word_contexts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("word_id", sa.Integer(), sa.ForeignKey("words.id"), nullable=False),
        sa.Column(
            "reading_content_id",
            sa.Integer(),
            sa.ForeignKey("reading_content.id"),
            nullable=True,
        ),
        sa.Column("sentence", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    # Add columns to words
    with op.batch_alter_table("words") as batch_op:
        batch_op.add_column(
            sa.Column(
                "reading_content_id",
                sa.Integer(),
                sa.ForeignKey("reading_content.id"),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column("encounters", sa.Integer(), nullable=False, server_default="0")
        )
        batch_op.add_column(
            sa.Column(
                "status", sa.String(length=30), nullable=False, server_default="new"
            )
        )

    # Add word_id to cards
    with op.batch_alter_table("cards") as batch_op:
        batch_op.add_column(
            sa.Column("word_id", sa.Integer(), sa.ForeignKey("words.id"), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("cards") as batch_op:
        batch_op.drop_column("word_id")

    with op.batch_alter_table("words") as batch_op:
        batch_op.drop_column("status")
        batch_op.drop_column("encounters")
        batch_op.drop_column("reading_content_id")

    op.drop_table("word_contexts")
