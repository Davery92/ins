# Dockerfile for RiskNinja Backend
FROM node:18-bullseye-slim
# Install build tools for native modules
RUN apt-get update && apt-get install -y python3 make g++ bzip2 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
# Install all dependencies (including dev for build)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies for production
RUN npm prune --production

# Expose port
EXPOSE 5000

# Start the server
CMD ["npm", "start"] 