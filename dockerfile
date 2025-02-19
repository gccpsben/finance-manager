# syntax=docker.io/docker/dockerfile:1.7-labs

# Build Stage (We need to use debian in this stage due to limitation)
FROM denoland/deno:debian AS BASE
WORKDIR /app
RUN apt-get update && apt-get -y install npm --no-install-recommends && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN mkdir ./frontend && mkdir ./backend
# Build Frontend
COPY --exclude=node_modules --exclude=README.md ./frontend-sqlite/ ./frontend
WORKDIR /app/frontend
RUN npm install && npm run build
# Build Backend
WORKDIR /app/backend
COPY ./server-sqlite/node.clean .
COPY ./server-sqlite/deno.json .
COPY ./server-sqlite/deno.lock .
COPY ./server-sqlite/package-lock.json .
COPY ./server-sqlite/package.json .
RUN deno install --allow-scripts=npm:argon2 && npm install sqlite3 --production
COPY ./server-sqlite/server_source ./server_source
RUN npx clean-modules -y --no-defaults --glob-file="./node.clean"

# Deploy stage
FROM denoland/deno:alpine AS TOP
RUN apk add --no-cache nodejs
COPY --from=BASE --exclude=frontend /app /app
WORKDIR /app/backend
CMD ["deno", "run", "--allow-all", "./server_source/index.ts", "/data/.prod.env"]