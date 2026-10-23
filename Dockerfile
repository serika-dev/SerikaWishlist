FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Coolify passes NODE_ENV=production as a build arg, which makes npm omit
# devDependencies — but tailwindcss, @tailwindcss/postcss and typescript all
# live there and `next build` needs them. Force a full install; none of this
# reaches the runner stage, which only copies the standalone output.
RUN npm ci --include=dev

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3710
ENV HOSTNAME=0.0.0.0

RUN addgroup -S serika && adduser -S serika -G serika

COPY --from=builder /app/public ./public
COPY --from=builder --chown=serika:serika /app/.next/standalone ./
COPY --from=builder --chown=serika:serika /app/.next/static ./.next/static

USER serika
EXPOSE 3710

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3710/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
