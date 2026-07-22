"""Builds link-preview metadata for shared invitation links.

Composes two existing use cases — the invitation preview (which validates
the token: exists, not expired, not revoked) and the cover-image lookup —
into the handful of strings a crawler needs.

The copy is Spanish: an invite is person-to-person and the audience is
Spanish-speaking. Crawlers don't negotiate language reliably, so picking one
beats guessing.
"""

from datetime import date
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from app.domain.cover.destination import derive_destination
from app.domain.cover.service import CoverService
from app.domain.invitations.service import InvitationService
from app.domain.share.entity import ShareMeta
from app.domain.trips.ports import TripRepository

# Open Graph images render best at 1200x630. Unsplash resizes on the fly.
_OG_IMAGE_PARAMS = {"w": "1200", "h": "630", "fit": "crop"}


def _sized_for_og(url: str) -> str:
    """Force the OG dimensions onto the provider's URL.

    The provider already sends sizing params (``w``, ``fit``…); appending
    ours would leave the URL with each key twice, and which one wins is
    then up to the image CDN. Replace instead of append.
    """
    parts = urlsplit(url)
    params = dict(parse_qsl(parts.query, keep_blank_values=True))
    params.update(_OG_IMAGE_PARAMS)
    return urlunsplit(parts._replace(query=urlencode(params)))

_MONTHS_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def _format_range(start: date | None, end: date | None) -> str | None:
    """"10 – 18 de julio de 2026" / "julio de 2026" style, kept short."""

    def one(d: date) -> str:
        return f"{d.day} de {_MONTHS_ES[d.month - 1]} de {d.year}"

    if start and end:
        if start.year == end.year and start.month == end.month:
            return (
                f"{start.day}–{end.day} de {_MONTHS_ES[start.month - 1]} "
                f"de {start.year}"
            )
        return f"{one(start)} – {one(end)}"
    if start:
        return one(start)
    if end:
        return one(end)
    return None


class ShareService:
    def __init__(
        self,
        invitations: InvitationService,
        trips: TripRepository,
        cover: CoverService,
    ) -> None:
        self._invitations = invitations
        self._trips = trips
        self._cover = cover

    async def invitation_meta(self, *, token: str) -> ShareMeta:
        # Raises InvitationInvalid for unknown / expired / revoked tokens,
        # which the API turns into a 404 — no preview for a dead link.
        preview = await self._invitations.preview(token)

        trip = await self._trips.get_by_id(preview.trip_id)
        date_range = _format_range(trip.start_date, trip.end_date) if trip else None

        inviter = preview.inviter_display_name.strip()
        title = (
            f"{inviter} te invita a {preview.trip_name}"
            if inviter
            else f"Te invitan a {preview.trip_name}"
        )
        description = (
            f"{date_range} · Únete al viaje y llevad los gastos juntos."
            if date_range
            else "Únete al viaje y llevad los gastos juntos en Tripinci."
        )

        image = await self._cover.get_cover_image(
            destination=derive_destination(preview.trip_name)
        )
        image_url = _sized_for_og(image.image_url) if image else None

        return ShareMeta(title=title, description=description, image_url=image_url)
