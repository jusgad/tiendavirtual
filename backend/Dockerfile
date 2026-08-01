# ---------- build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps (incl. dev) using the lockfile for reproducibility
COPY package*.json ./
RUN npm ci

# Prisma client needs the schema at generate time
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Compile the standalone seed script (lives in prisma/, outside src rootDir)
RUN npx tsc prisma/seed.ts --outDir dist/prisma --module commonjs --target ES2022 \
    --esModuleInterop --skipLibCheck --resolveJsonModule

# Prune dev dependencies for the runtime image (prisma CLI stays as a dependency)
RUN npm prune --omit=dev

# ---------- runtime stage ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Run as the built-in non-root user
USER node
EXPOSE 3000

# Apply migrations then start (entrypoint script keeps it explicit)
CMD ["node", "dist/main.js"]
