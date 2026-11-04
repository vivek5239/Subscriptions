# Stage 1: Build React Client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy server code
COPY server/ ./

# Copy built client assets to 'public' folder in server
COPY --from=client-build /app/client/dist ./public

# Environment variables
ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "index.js"]
