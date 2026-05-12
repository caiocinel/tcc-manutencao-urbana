FROM node:20-alpine AS frontend-build
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache tini logrotate wget

COPY backend/package*.json ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm install --omit=dev \
  && apk del .build-deps

COPY backend/ ./
COPY --from=frontend-build /build/dist /app/public

RUN mkdir -p /app/uploads /app/logs

COPY scripts/logrotate.conf /etc/logrotate.d/app
RUN chmod 644 /etc/logrotate.d/app

RUN echo "0 0 * * * /usr/sbin/logrotate -s /var/lib/logrotate/status /etc/logrotate.d/app" >> /etc/crontabs/root

EXPOSE 5000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--max-old-space-size=2048", "index.js"]
