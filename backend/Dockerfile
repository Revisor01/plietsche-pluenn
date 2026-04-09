FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY src/ ./src/

RUN npx tsc

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY drizzle.config.ts ./
COPY src/db/schema.ts ./src/db/schema.ts
COPY firebase-service-account.json ./firebase-service-account.json

EXPOSE 3000

CMD ["node", "dist/server.js"]
