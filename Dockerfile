FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ pkg-config \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo \
    libgif7 librsvg2-2 libuuid1 fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY . .

RUN mkdir -p /app/database/data /app/scripts/cmds/tmp /app/scripts/events/tmp \
    && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["node", "index.js"]
