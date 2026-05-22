FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

RUN pip install poetry && \
    poetry config virtualenvs.create false

COPY pyproject.toml poetry.lock* ./
RUN poetry install --no-root

COPY . .

# ── Dev target ─────────────────────────────────────────
FROM base AS dev
# hot-reload via uvicorn --reload (mounted volume in compose)

# ── Prod target ────────────────────────────────────────
FROM base AS prod
RUN poetry install --no-root --only main
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
