FROM node:20
WORKDIR /app

# Build tools install - eita chara Goat Bot install hobe na
RUN apt-get update && apt-get install -y python3 make g++ git && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY . .
CMD ["node", "index.js"]
