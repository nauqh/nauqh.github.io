FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml README.md ./
COPY musiccat ./musiccat

RUN pip install --no-cache-dir .

CMD ["python", "-O", "-m", "musiccat"]
