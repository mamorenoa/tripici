"""Domain exceptions for the trips area.

These are framework-agnostic. ``app.main`` registers exception handlers
that convert them to HTTP responses (404). We intentionally return 404
for "not yours" too — leaking existence is worse than the lost nuance.
"""

from uuid import UUID


class TripNotFound(Exception):
    """The trip id does not exist or does not belong to the current user."""

    def __init__(self, trip_id: UUID) -> None:
        super().__init__(f"Trip {trip_id} not found")
        self.trip_id = trip_id


class MemberNotFound(Exception):
    """The user is not a collaborator on this trip."""


class CannotRemoveOwner(Exception):
    """The trip owner cannot be removed from their own trip."""


class InvalidTripDates(Exception):
    """The resulting trip span is invalid (end date before start date)."""
