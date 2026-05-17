FROM python:3.13-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    binutils libproj-dev gdal-bin \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.13-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    binutils libproj-dev gdal-bin wget postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

WORKDIR /app

COPY . .

RUN mkdir -p /app/uploads /app/staticfiles && \
    chown -R django:django /app

# SECURITY: Run as non-root user
RUN groupadd --system --gid 1001 django && \
    useradd --system --uid 1001 --gid 1001 --home-dir /app django
USER django

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
