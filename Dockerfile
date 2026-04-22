FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120 \
    PIP_RETRIES=5

WORKDIR /app

# ca-certificates: HTTPS to PyPI; build tools not required for this pure-Python app wheel.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml /app/pyproject.toml
COPY app /app/app
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini

# Install setuptools+wheel first, then the app with --no-build-isolation so pip does not
# spawn a second isolated env that re-downloads build deps from PyPI (saves one round trip).
# If the build still fails with "Temporary failure in name resolution", fix Docker DNS
# (e.g. Docker Desktop → Settings → Docker Engine: "dns": ["8.8.8.8", "1.1.1.1"]).
RUN pip install --upgrade pip \
    && pip install "setuptools>=61" wheel \
    && pip install --no-build-isolation --no-cache-dir .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
