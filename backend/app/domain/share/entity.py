"""Link-preview (Open Graph) metadata for a shared invitation.

Deliberately minimal: the endpoint that serves this is PUBLIC (crawlers
cannot authenticate), so it exposes only what a preview needs — never
amounts, members or emails.
"""

from sqlmodel import SQLModel


class ShareMeta(SQLModel):
    # Ready-to-use Open Graph strings, composed server-side so the edge
    # worker stays dumb.
    title: str
    description: str
    # Absolute, publicly fetchable image URL. ``None`` when the trip has no
    # resolvable cover — the worker then falls back to the brand image.
    image_url: str | None = None
