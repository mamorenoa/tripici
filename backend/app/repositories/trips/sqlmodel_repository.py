"""SQLModel-backed implementation of ``TripRepository``.

The only place in the app that knows about ``Session`` and SQL queries.
Implements the ``TripRepository`` Protocol structurally — no inheritance
needed, just matching method signatures.
"""

from uuid import UUID

from sqlmodel import Session, select

from app.domain.trips.entity import Trip


class SQLModelTripRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, trip: Trip) -> Trip:
        self._session.add(trip)
        self._session.commit()
        self._session.refresh(trip)
        return trip

    def list_for_owner(self, owner_id: UUID) -> list[Trip]:
        statement = (
            select(Trip)
            .where(Trip.owner_id == owner_id)
            .order_by(Trip.created_at.desc())
        )
        return list(self._session.exec(statement).all())
