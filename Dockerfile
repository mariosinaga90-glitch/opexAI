# ===========================
# Stage 1: Build Frontend
# ===========================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --production=false

COPY frontend/ .

# Build with /api as the base URL (nginx will reverse-proxy to backend)
ENV VITE_API_BASE_URL=/api
RUN npm run build

# ===========================
# Stage 2: Build Backend
# ===========================
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev

COPY backend/src ./src
COPY backend/drizzle.config.js ./

# ===========================
# Stage 3: Production Backend
# ===========================
FROM node:20-alpine AS backend

WORKDIR /app

# Install build tools for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

COPY --from=backend-builder /app/backend/package.json ./
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/src ./src
COPY --from=backend-builder /app/backend/drizzle.config.js ./

# Rebuild native modules for this exact alpine image
RUN npm rebuild better-sqlite3

# Create data and uploads directories
RUN mkdir -p /app/data /app/uploads

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/opex.db

EXPOSE 3001

VOLUME ["/app/data", "/app/uploads"]

CMD ["node", "src/index.js"]

# ===========================
# Stage 4: Production Frontend (Nginx)
# ===========================
FROM nginx:alpine AS frontend

RUN rm -rf /usr/share/nginx/html/*

COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
