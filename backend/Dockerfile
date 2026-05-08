FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm install --omit=optional --omit=dev \
  && apk del .build-deps

COPY . .

EXPOSE 5000

CMD ["node", "--max-old-space-size=150", "index.js"]
