# Purabiya Foundation Admin — Next.js (standalone output)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Required at build time — baked into client JS bundle
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=${NEXT_PUBLIC_RAZORPAY_KEY_ID}
ARG NEXT_PUBLIC_FIRECONNECT_CLIENT_KEY
ENV NEXT_PUBLIC_FIRECONNECT_CLIENT_KEY=${NEXT_PUBLIC_FIRECONNECT_CLIENT_KEY}
ARG NEXT_PUBLIC_FIRECONNECT_CLIENT_SECRET
ENV NEXT_PUBLIC_FIRECONNECT_CLIENT_SECRET=${NEXT_PUBLIC_FIRECONNECT_CLIENT_SECRET}

ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
