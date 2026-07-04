#!/bin/sh
set -e

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Running database migrations (alembic upgrade head)..."
  attempt=1
  max_attempts=10
  until alembic upgrade head; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "Migration failed after ${max_attempts} attempts." >&2
      exit 1
    fi
    echo "Migration failed, retry in 3s (${attempt}/${max_attempts})..."
    attempt=$((attempt + 1))
    sleep 3
  done
  echo "Migrations complete."
fi

exec "$@"
