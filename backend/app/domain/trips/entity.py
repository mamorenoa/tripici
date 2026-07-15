"""Trip domain entity.

The SQLModel class doubles as the domain entity and the persistence
mapping. The repository layer is the only place that touches sessions
and SQL — the domain only sees this dataclass-like shape.
"""

from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from pydantic import model_validator
from sqlmodel import Field, SQLModel


class TripBase(SQLModel):
    """Fields shared by the create payload and the persisted entity."""

    name: str = Field(min_length=1, max_length=200, index=True)
    # Optional trip span. Both are independent: a trip can have just a
    # start, just an end, both, or neither.
    start_date: date | None = None
    end_date: date | None = None


class Trip(TripBase, table=True):
    """A shared trip created by a user. Persisted in the ``trip`` table."""

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True,
    )


class TripCreate(TripBase):
    """Payload accepted by ``POST /trips``."""

    @model_validator(mode="after")
    def _check_date_range(self) -> "TripCreate":
        if (
            self.start_date is not None
            and self.end_date is not None
            and self.end_date < self.start_date
        ):
            raise ValueError("end_date must be on or after start_date")
        return self
