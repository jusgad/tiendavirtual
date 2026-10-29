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

# ---------- test stage ----------
# Sale de `builder` ANTES de podar: los tests necesitan jest, ts-jest y
# supertest, que son dependencias de desarrollo. No entra en la imagen final.
FROM builder AS tester
COPY jest.config.js ./
COPY tests ./tests
CMD ["npm", "test"]

# ---------- prune stage ----------
# La poda vive en su propia etapa para que `tester` pueda salir de `builder`
# con las dependencias de desarrollo intactas.
FROM builder AS pruned
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
COPY --from=pruned --chown=node:node /app/node_modules ./node_modules
COPY --from=pruned --chown=node:node /app/dist ./dist
COPY --from=pruned --chown=node:node /app/prisma ./prisma
COPY --chown=node:node package*.json ./

# Run as the built-in non-root user
USER node
EXPOSE 3000

# Apply migrations then start (entrypoint script keeps it explicit)
CMD ["node", "dist/main.js"]
