"""Trip use cases.

The service is framework-agnostic Python. It depends on the
``TripRepository`` and ``MembershipRepository`` ports; the View layer
wires the concrete repositories.
"""

from datetime import date
from uuid import UUID

from app.domain.memberships.ports import MembershipRepository
from app.domain.trips.entity import Trip, TripUpdate
from app.domain.trips.exceptions import (
    CannotRemoveOwner,
    InvalidTripDates,
    MemberNotFound,
    TripNotFound,
)
from app.domain.trips.ports import TripRepository


class TripService:
    def __init__(
        self,
        repository: TripRepository,
        memberships: MembershipRepository,
    ) -> None:
        self._repository = repository
        self._memberships = memberships

    async def create_trip(
        self,
        *,
        name: str,
        owner_id: UUID,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> Trip:
        # ``id`` and ``created_at`` come from the entity defaults so the
        # domain (not the DB) controls them.
        trip = Trip(
            name=name,
            owner_id=owner_id,
            start_date=start_date,
            end_date=end_date,
        )
        return await self._repository.add(trip)

    async def update_trip(
        self, *, trip_id: UUID, user_id: UUID, patch: TripUpdate
    ) -> Trip:
        """Edit a trip's name and/or date range. Owner-only.

        We reuse the "not yours → 404" convention so we never leak the
        existence of someone else's trip. The date range is validated
        against the *merged* result (a partial patch may touch only one
        bound).
        """
        trip = await self._repository.get_by_id(trip_id)
        if trip is None or trip.owner_id != user_id:
            raise TripNotFound(trip_id)

        for key, value in patch.model_dump(exclude_unset=True).items():
            setattr(trip, key, value)

        if (
            trip.start_date is not None
            and trip.end_date is not None
            and trip.end_date < trip.start_date
        ):
            raise InvalidTripDates()

        return await self._repository.update(trip)

    async def list_trips(self, *, user_id: UUID) -> list[Trip]:
        """Returns trips the user owns AND trips shared with them."""
        return await self._repository.list_for_user(user_id)

    async def get_for_member(self, *, trip_id: UUID, user_id: UUID) -> Trip:
        """Returns the trip if the user is owner OR a member.

        We return 404 for both "trip doesn't exist" and "not yours" so
        we don't leak the existence of someone else's trip.
        """
        trip = await self._repository.get_by_id(trip_id)
        if trip is None:
            raise TripNotFound(trip_id)
        if trip.owner_id == user_id:
            return trip
        if await self._memberships.exists(trip_id=trip_id, user_id=user_id):
            return trip
        raise TripNotFound(trip_id)

    async def remove_member(
        self, *, trip_id: UUID, requester_id: UUID, target_user_id: UUID
    ) -> None:
        trip = await self._repository.get_by_id(trip_id)
        if trip is None:
            raise TripNotFound(trip_id)
        if trip.owner_id != requester_id:
            raise TripNotFound(trip_id)  # don't leak existence
        if trip.owner_id == target_user_id:
            raise CannotRemoveOwner()
        removed = await self._memberships.delete(trip_id=trip_id, user_id=target_user_id)
        if not removed:
            raise MemberNotFound()
