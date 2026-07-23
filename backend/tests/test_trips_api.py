"""Happy-path tests for the trips endpoints (authenticated)."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from httpx import AsyncClient
from sqlalchemy import text

from app.domain.expenses.entity import Expense
from app.domain.invitations.entity import TripInvitation
from app.domain.memberships.entity import TripMembership
from app.domain.plans.entity import Plan
from app.domain.settlements.entity import SettlementPayment
from app.domain.trips.entity import Trip
from app.domain.users.entity import User


async def test_create_trip_returns_201_and_payload(
    authed_client: AsyncClient, test_user: User
) -> None:
    response = await authed_client.post("/trips", json={"name": "Italy 2026"})

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Italy 2026"
    assert body["owner_id"] == str(test_user.id)
    UUID(body["id"])  # parses as UUID
    assert "created_at" in body


async def test_list_trips_is_empty_initially(authed_client: AsyncClient) -> None:
    response = await authed_client.get("/trips")

    assert response.status_code == 200
    assert response.json() == []


async def test_create_then_list_returns_the_created_trips(
    authed_client: AsyncClient,
) -> None:
    await authed_client.post("/trips", json={"name": "Italy 2026"})
    await authed_client.post("/trips", json={"name": "Greece 2026"})

    response = await authed_client.get("/trips")

    assert response.status_code == 200
    names = [t["name"] for t in response.json()]
    assert sorted(names) == ["Greece 2026", "Italy 2026"]


async def test_create_trip_rejects_empty_name(authed_client: AsyncClient) -> None:
    response = await authed_client.post("/trips", json={"name": ""})

    assert response.status_code == 422


async def test_create_trip_with_date_range_persists_dates(
    authed_client: AsyncClient,
) -> None:
    response = await authed_client.post(
        "/trips",
        json={
            "name": "Italy 2026",
            "start_date": "2026-08-01",
            "end_date": "2026-08-10",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["start_date"] == "2026-08-01"
    assert body["end_date"] == "2026-08-10"


async def test_create_trip_without_dates_defaults_to_null(
    authed_client: AsyncClient,
) -> None:
    body = (await authed_client.post("/trips", json={"name": "No dates"})).json()

    assert body["start_date"] is None
    assert body["end_date"] is None


async def test_create_trip_rejects_end_before_start(
    authed_client: AsyncClient,
) -> None:
    response = await authed_client.post(
        "/trips",
        json={
            "name": "Backwards",
            "start_date": "2026-08-10",
            "end_date": "2026-08-01",
        },
    )

    assert response.status_code == 422


async def test_update_trip_edits_name_and_dates(
    authed_client: AsyncClient,
) -> None:
    created = (
        await authed_client.post("/trips", json={"name": "Málaga"})
    ).json()

    response = await authed_client.patch(
        f"/trips/{created['id']}",
        json={
            "name": "Málaga 2026",
            "start_date": "2026-07-25",
            "end_date": "2026-07-31",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Málaga 2026"
    assert body["start_date"] == "2026-07-25"
    assert body["end_date"] == "2026-07-31"


async def test_update_trip_partial_patch_leaves_other_fields(
    authed_client: AsyncClient,
) -> None:
    created = (
        await authed_client.post(
            "/trips",
            json={"name": "Keep me", "start_date": "2026-07-01"},
        )
    ).json()

    response = await authed_client.patch(
        f"/trips/{created['id']}", json={"end_date": "2026-07-05"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Keep me"  # untouched
    assert body["start_date"] == "2026-07-01"  # untouched
    assert body["end_date"] == "2026-07-05"


async def test_update_trip_rejects_end_before_start(
    authed_client: AsyncClient,
) -> None:
    created = (
        await authed_client.post(
            "/trips",
            json={"name": "Range", "start_date": "2026-07-10"},
        )
    ).json()

    response = await authed_client.patch(
        f"/trips/{created['id']}", json={"end_date": "2026-07-01"}
    )

    assert response.status_code == 400


async def test_update_trip_by_non_owner_returns_404(
    authed_client: AsyncClient,
    session,
    second_user: User,
) -> None:
    """A trip you don't own is invisible: editing it 404s, no leak."""
    from app.domain.trips.entity import Trip

    trip = Trip(name="Not yours", owner_id=second_user.id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)

    response = await authed_client.patch(
        f"/trips/{trip.id}", json={"name": "hijacked"}
    )
    assert response.status_code == 404


async def test_trips_requires_authentication(client: AsyncClient) -> None:
    """Without the override, ``current_active_user`` rejects the call."""
    response = await client.get("/trips")
    assert response.status_code == 401


async def test_get_trip_by_id_returns_the_trip(
    authed_client: AsyncClient, test_user: User
) -> None:
    created = (
        await authed_client.post("/trips", json={"name": "Italy 2026"})
    ).json()

    response = await authed_client.get(f"/trips/{created['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body["name"] == "Italy 2026"
    assert body["owner_id"] == str(test_user.id)


async def test_get_trip_owned_by_someone_else_returns_404(
    authed_client: AsyncClient,
    session,
    second_user: User,
) -> None:
    from app.domain.trips.entity import Trip

    trip = Trip(name="Not yours", owner_id=second_user.id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)

    response = await authed_client.get(f"/trips/{trip.id}")
    assert response.status_code == 404


async def test_get_unknown_trip_returns_404(authed_client: AsyncClient) -> None:
    from uuid import uuid4

    response = await authed_client.get(f"/trips/{uuid4()}")
    assert response.status_code == 404


async def test_member_sees_shared_trip_in_list(
    client: AsyncClient,
    session,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    """A collaborator's GET /trips includes trips they don't own."""
    from app.domain.memberships.entity import TripMembership
    from app.domain.trips.entity import Trip

    # test_user owns 1 trip, second_user is added as collaborator.
    trip = Trip(name="Greece 2026", owner_id=test_user.id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    session.add(TripMembership(trip_id=trip.id, user_id=second_user.id))
    await session.commit()

    as_user(second_user)
    listed = await client.get("/trips")

    assert listed.status_code == 200
    names = [t["name"] for t in listed.json()]
    assert "Greece 2026" in names


# ── Deleting a trip ──────────────────────────────────────────────────
#
# Deletion is a hard one and relies on the schema's ON DELETE CASCADE
# constraints rather than on application code, so the tests below check
# the database state, not just the status codes.


async def _trip_with_everything(session, *, owner: User, member: User) -> Trip:
    """A trip carrying one row in each table that references it."""
    trip = Trip(name="Italy 2026", owner_id=owner.id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)

    session.add(TripMembership(trip_id=trip.id, user_id=member.id))
    session.add(
        TripInvitation(
            trip_id=trip.id,
            token="tok-delete",
            created_by_user_id=owner.id,
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None)
            + timedelta(days=7),
        )
    )
    session.add(
        Expense(
            trip_id=trip.id,
            name="Dinner",
            amount_cents=4_000,
            category_code="RESTAURANTS",
            created_by_user_id=owner.id,
            paid_by_user_id=owner.id,
        )
    )
    session.add(
        Plan(
            trip_id=trip.id,
            name="Colosseum",
            description="Guided tour",
            created_by_user_id=owner.id,
        )
    )
    session.add(
        SettlementPayment(
            trip_id=trip.id,
            from_user_id=member.id,
            to_user_id=owner.id,
            amount_cents=2_000,
            created_by_user_id=owner.id,
        )
    )
    await session.commit()
    return trip


async def _count_children(session, trip_id) -> dict[str, int]:
    counts: dict[str, int] = {}
    for table in (
        "expense",
        "plan",
        "trip_membership",
        "trip_invitation",
        "settlement_payment",
    ):
        result = await session.execute(
            text(f"SELECT count(*) FROM {table} WHERE trip_id = :trip_id"),  # noqa: S608
            {"trip_id": trip_id},
        )
        counts[table] = result.scalar_one()
    return counts


async def test_owner_can_delete_trip(
    authed_client: AsyncClient, session, test_user: User
) -> None:
    created = await authed_client.post("/trips", json={"name": "Italy 2026"})
    trip_id = created.json()["id"]

    response = await authed_client.delete(f"/trips/{trip_id}")

    assert response.status_code == 204
    assert (await authed_client.get(f"/trips/{trip_id}")).status_code == 404
    assert (await authed_client.get("/trips")).json() == []


async def test_deleting_a_trip_removes_everything_hanging_off_it(
    client: AsyncClient,
    session,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    """The cascade is a schema guarantee — pin it down."""
    trip = await _trip_with_everything(session, owner=test_user, member=second_user)
    before = await _count_children(session, trip.id)
    assert all(count == 1 for count in before.values()), before

    as_user(test_user)
    response = await client.delete(f"/trips/{trip.id}")

    assert response.status_code == 204
    # The session cached those rows; go back to the database.
    session.expunge_all()
    assert await _count_children(session, trip.id) == {
        "expense": 0,
        "plan": 0,
        "trip_membership": 0,
        "trip_invitation": 0,
        "settlement_payment": 0,
    }


async def test_member_cannot_delete_trip(
    client: AsyncClient,
    session,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    """A collaborator gets the outsider's answer, and the trip survives."""
    trip = Trip(name="Italy 2026", owner_id=test_user.id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    session.add(TripMembership(trip_id=trip.id, user_id=second_user.id))
    await session.commit()

    as_user(second_user)
    response = await client.delete(f"/trips/{trip.id}")

    assert response.status_code == 404
    assert (await client.get(f"/trips/{trip.id}")).status_code == 200


async def test_outsider_cannot_delete_trip(
    authed_client: AsyncClient, session, second_user: User
) -> None:
    trip = Trip(name="Not yours", owner_id=second_user.id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)

    response = await authed_client.delete(f"/trips/{trip.id}")

    assert response.status_code == 404


async def test_delete_unknown_trip_returns_404(authed_client: AsyncClient) -> None:
    from uuid import uuid4

    assert (await authed_client.delete(f"/trips/{uuid4()}")).status_code == 404


async def test_deleted_trip_disappears_for_the_collaborator(
    client: AsyncClient,
    session,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _trip_with_everything(session, owner=test_user, member=second_user)

    as_user(test_user)
    await client.delete(f"/trips/{trip.id}")

    as_user(second_user)
    assert (await client.get("/trips")).json() == []
    assert (await client.get(f"/trips/{trip.id}")).status_code == 404


async def test_global_stats_stop_counting_a_deleted_trip(
    client: AsyncClient,
    session,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    """Stats are live aggregates, so nothing recalculates them — but the
    numbers must drop on their own once the expenses are gone."""
    trip = await _trip_with_everything(session, owner=test_user, member=second_user)

    as_user(second_user)
    before = (await client.get("/stats")).json()
    assert before["total_cents"] == 4_000

    as_user(test_user)
    await client.delete(f"/trips/{trip.id}")

    as_user(second_user)
    after = (await client.get("/stats")).json()
    assert after["total_cents"] == 0
    assert after["by_trip"] == []
