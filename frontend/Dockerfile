FROM node:20-alpine AS base
WORKDIR /app

# ── Dependencies ───────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ── Dev target (hot reload via volume mount) ───────────
FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Builder ────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN npm run build

# ── Prod target ────────────────────────────────────────
FROM base AS prod
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
