# Debian slim y no Alpine: Prisma necesita OpenSSL para elegir su motor de
# consulta, y en Alpine (musl) la detección falla y cae a un binario que no
# corresponde. Pesa algo más y funciona.
# ---------- build stage ----------
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

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
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# `--chown=node` no es cosmético: el contenedor corre como `node`, y
# `prisma migrate deploy` escribe en `node_modules/@prisma`. Sin esto arranca
# en bucle quejándose de permisos.
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --chown=node:node package*.json ./

# Run as the built-in non-root user
USER node
EXPOSE 3000

# Apply migrations then start (entrypoint script keeps it explicit)
CMD ["node", "dist/main.js"]
