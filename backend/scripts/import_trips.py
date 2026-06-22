"""Import standardized historical trips into the database.

Reads ``data/trips_seed.json`` and, for each trip, creates:
- a ``trip`` owned by ``--owner``,
- a ``trip_membership`` for ``--member`` (so the trip shows up in BOTH
  profiles and common expenses split between the two),
- one common ``expense`` per line item (``paid_by_user_id = NULL``;
  ``created_by_user_id`` = the owner, purely as the audit author).

Idempotent: a trip whose ``name`` already exists for that owner is
skipped, so the script is safe to re-run.

Usage (against production — set DATABASE_URL first):

    cd backend
    DATABASE_URL="postgres://USER:PASS@HOST:PORT/DB" \\
      uv run python -m scripts.import_trips \\
        --owner  miguel@example.com \\
        --member esther@example.com \\
        --dry-run

Drop ``--dry-run`` to actually write. ``--owner`` / ``--member`` accept
either a user UUID or an email. Run with ``--dry-run`` first: it prints,
per trip, the item count and the computed total vs. the total declared
in the original file, so you can spot transcription drift before
committing anything.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import async_session_maker
from app.domain.categories.entity import Category
from app.domain.expenses.entity import Expense
from app.domain.memberships.entity import TripMembership
from app.domain.trips.entity import Trip
from app.domain.users.entity import User

DEFAULT_JSON = Path(__file__).resolve().parent.parent / "data" / "trips_seed.json"


def _euros(cents: int) -> str:
    return f"{cents / 100:,.2f} €"


async def _resolve_user(session: AsyncSession, ref: str) -> User:
    """Look up a user by UUID or email; abort if missing."""
    try:
        user = await session.get(User, UUID(ref))
    except ValueError:
        result = await session.execute(select(User).where(User.email == ref))
        user = result.scalar_one_or_none()
    if user is None:
        sys.exit(f"✗ User not found: {ref!r}. Both users must exist first.")
    return user


async def _trip_exists(session: AsyncSession, *, name: str, owner_id: UUID) -> bool:
    result = await session.execute(
        select(func.count())
        .select_from(Trip)
        .where(Trip.name == name, Trip.owner_id == owner_id)
    )
    return (result.scalar_one() or 0) > 0


async def run(
    *, json_path: Path, owner_ref: str, member_ref: str, dry_run: bool
) -> None:
    payload = json.loads(json_path.read_text(encoding="utf-8"))
    trips = payload["trips"]

    async with async_session_maker() as session:
        owner = await _resolve_user(session, owner_ref)
        member = await _resolve_user(session, member_ref)
        if owner.id == member.id:
            sys.exit("✗ Owner and member must be two different users.")

        # Validate category codes against what's actually seeded.
        valid_codes = {
            c for c in (await session.execute(select(Category.code))).scalars()
        }

        mode = "DRY-RUN (no writes)" if dry_run else "WRITING"
        print(f"\n=== Import trips · {mode} ===")
        print(f"Owner : {owner.email} ({owner.id})")
        print(f"Member: {member.email} ({member.id})\n")

        created = skipped = 0
        for trip in trips:
            name = trip["name"]
            expenses = trip["expenses"]
            computed = sum(e["amount_cents"] for e in expenses)
            source = trip.get("source_total_cents")

            # Checksum line.
            check = ""
            if source is not None:
                diff = computed - source
                flag = "OK" if diff == 0 else f"Δ {_euros(diff)}"
                check = f" | declarado {_euros(source)} [{flag}]"
            print(
                f"• {name}: {len(expenses)} gastos, total {_euros(computed)}{check}"
            )
            if trip.get("note"):
                print(f"    ⚠ {trip['note']}")

            bad = {e["category_code"] for e in expenses} - valid_codes
            if bad:
                sys.exit(f"✗ Unknown category code(s) in {name!r}: {sorted(bad)}")

            if await _trip_exists(session, name=name, owner_id=owner.id):
                print("    ↳ ya existe, se omite")
                skipped += 1
                continue

            created += 1
            if dry_run:
                continue

            new_trip = Trip(name=name, owner_id=owner.id)
            session.add(new_trip)
            await session.flush()  # assign new_trip.id
            session.add(
                TripMembership(trip_id=new_trip.id, user_id=member.id)
            )
            for e in expenses:
                session.add(
                    Expense(
                        trip_id=new_trip.id,
                        created_by_user_id=owner.id,
                        paid_by_user_id=None,  # común → se reparte entre miembros
                        amount_cents=e["amount_cents"],
                        category_code=e["category_code"],
                        expense_date=e["expense_date"],
                        description=e.get("description"),
                    )
                )

        if dry_run:
            print(f"\nDry-run: {created} viajes a crear, {skipped} ya existentes.")
        else:
            await session.commit()
            print(f"\n✓ Hecho: {created} viajes creados, {skipped} omitidos.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import historical trips.")
    parser.add_argument("--owner", required=True, help="Owner UUID or email")
    parser.add_argument("--member", required=True, help="Member UUID or email")
    parser.add_argument(
        "--json", type=Path, default=DEFAULT_JSON, help="Path to trips_seed.json"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and print without writing to the DB",
    )
    args = parser.parse_args()
    asyncio.run(
        run(
            json_path=args.json,
            owner_ref=args.owner,
            member_ref=args.member,
            dry_run=args.dry_run,
        )
    )


if __name__ == "__main__":
    main()
