# ===========================
# Stage 1: Build Frontend
# ===========================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
# Ensure devDependencies are installed so Vite is available
RUN npm ci --include=dev

COPY frontend/ .

# Build with /api as the base URL
ENV VITE_API_BASE_URL=/api
RUN npm run build

# ===========================
# Stage 2: Build Backend
# ===========================
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./

# Install python and build tools for better-sqlite3 compilation
RUN apk add --no-cache python3 make g++
RUN npm ci --omit=dev

COPY backend/src ./src
COPY backend/drizzle.config.js ./

# ===========================
# Stage 3: Production Final Image (Unified Monolith)
# ===========================
FROM node:20-alpine AS production

WORKDIR /app

# Install build tools for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

# Copy backend files
COPY --from=backend-builder /app/backend/package.json ./backend/
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules/
COPY --from=backend-builder /app/backend/src ./backend/src/
COPY --from=backend-builder /app/backend/drizzle.config.js ./backend/

# Copy compiled frontend to where backend expects it (../frontend/dist relative to backend)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist/

# Rebuild native modules for this exact alpine image
WORKDIR /app/backend
RUN npm rebuild better-sqlite3

# Create data and uploads directories
RUN mkdir -p /app/backend/data /app/backend/uploads

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/backend/data/opex.db

EXPOSE 3001

# Install drizzle-kit globally to run schema pushes in production
RUN npm install -g drizzle-kit

VOLUME ["/app/backend/data", "/app/backend/uploads"]

# Push schema, seed data, then start the server
CMD ["sh", "-c", "npx drizzle-kit push --force && node src/db/seed.js && node src/index.js"]
