FROM node:20-slim

# Install build tools for better-sqlite3 native addon
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (including optional better-sqlite3)
COPY package*.json ./
RUN npm ci --include=optional

# Copy source
COPY tsconfig.json ./
COPY src/ src/

# Build TypeScript
RUN npx tsc

# Data volume for SQLite
RUN mkdir -p /data
VOLUME /data

ENV TRAPIC_PORT=3000
ENV TRAPIC_HOST=0.0.0.0
ENV TRAPIC_DB=/data/trapic.db
ENV TRAPIC_USER="local-user"

EXPOSE 3000

CMD ["node", "dist/server.js"]
