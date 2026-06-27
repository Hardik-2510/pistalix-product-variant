# ---------- Stage 1: build ----------
FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app

# Install ALL deps (incl. devDependencies like vite) so the build can run.
COPY package.json package-lock.json* ./
RUN npm ci

# Generate Prisma client + build the React Router app.
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production-only deps.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy build output, Prisma schema/migrations, and the generated client.
COPY --from=build /app/build ./build
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Persistent SQLite lives here (mounted as a Docker volume in production).
RUN mkdir -p /data

EXPOSE 3000

# Applies pending migrations against the volume DB, then starts the server.
CMD ["npm", "run", "docker-start"]
