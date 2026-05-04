FROM node:22.16.0-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_TILE_URL_PRE=http://localhost:8080/tiles/vn_provinces_pre_2025
ARG NEXT_PUBLIC_TILE_URL_POST=http://localhost:8080/tiles/vn_provinces_post_2025
ARG NEXT_PUBLIC_MAP_STYLE=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3002
ARG NEXT_PUBLIC_SENTRY_ENABLED=false
ARG NEXT_PUBLIC_SENTRY_DSN=
ENV NEXT_PUBLIC_TILE_URL_PRE=$NEXT_PUBLIC_TILE_URL_PRE
ENV NEXT_PUBLIC_TILE_URL_POST=$NEXT_PUBLIC_TILE_URL_POST
ENV NEXT_PUBLIC_MAP_STYLE=$NEXT_PUBLIC_MAP_STYLE
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SENTRY_ENABLED=$NEXT_PUBLIC_SENTRY_ENABLED
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22.16.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
