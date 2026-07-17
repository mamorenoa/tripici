"""Cover image shape.

A plain SQLModel type (no ``table=True``) used only as an API response
model — cover images are fetched from an external provider on demand and
never persisted.
"""

from sqlmodel import SQLModel


class CoverImage(SQLModel):
    image_url: str
    # Human-readable credit shown over the cover (e.g. "Ada Lovelace · Unsplash").
    attribution: str | None = None
    # Link back to the source page, opened when the credit is tapped.
    source_url: str | None = None
