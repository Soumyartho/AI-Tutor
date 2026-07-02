FROM python:3.11-slim

WORKDIR /app

# System deps for building any wheels that need compilation (kept minimal —
# core requirements.txt is otherwise pure-Python/manylinux wheels).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Most hosts (Render, Railway, Cloud Run) inject $PORT; default to 8000 for
# local `docker run`.
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
