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
# NEXT_PUBLIC_ vars must be present at build time — they get inlined into the JS bundle
ARG NEXT_PUBLIC_API_URL=https://api.curiocalc.org
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
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
