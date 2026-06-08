"""Category domain entity.

Pre-seeded lookup table. The ``code`` is a stable natural key that
expenses reference via FK. ``label`` is the human-friendly text shown
in the UI; for i18n later, the frontend maps ``code → localized label``.
"""

from sqlmodel import Field, SQLModel


class Category(SQLModel, table=True):
    code: str = Field(max_length=40, primary_key=True)
    label: str = Field(max_length=80, nullable=False)
