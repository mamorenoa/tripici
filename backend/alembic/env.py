"""Alembic environment.

We override ``sqlalchemy.url`` at runtime with the value from our own
``Settings`` so that ``alembic.ini`` doesn't need to repeat the
connection string.

``target_metadata`` is a list of metadatas (Alembic accepts that): one
for SQLModel-backed tables (currently ``trip``) and one for
SQLAlchemy-native tables (currently ``user`` via FastAPI-Users).
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

# Register every model by importing the modules that define them. New
# entities must be imported here too so autogenerate sees them.
from app.core.config import settings
from app.domain.categories import entity as _categories_entity  # noqa: F401
from app.domain.expenses import entity as _expenses_entity  # noqa: F401
from app.domain.trips import entity as _trips_entity  # noqa: F401
from app.domain.users.entity import Base as UsersBase  # noqa: F401
from app.domain.users import entity as _users_entity  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# All entities share ``SQLModel.metadata``: SQLModel models register
# there by default, and ``UsersBase`` was wired to point its metadata
# at the same object so cross-metadata FKs (e.g. expense.user_id) work.
target_metadata = SQLModel.metadata

# Use the URL from settings (env / .env). We strip the async driver
# spec because Alembic uses a sync connection for migrations — psycopg
# v3 works for both, so this is mostly to make the intent explicit.
config.set_main_option("sqlalchemy.url", settings.database_url)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
