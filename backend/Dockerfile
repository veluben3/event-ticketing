FROM node:20-slim

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npx tsc -p tsconfig.build.json

RUN mkdir -p uploads

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
