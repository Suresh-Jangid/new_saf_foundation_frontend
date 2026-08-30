# Deployment Guide — Purabiya Foundation Admin

This project has **two parts**:

| Part | Stack | Default port |
|------|--------|--------------|
| **Frontend** | Next.js 14 (standalone) | 3000 |
| **Backend** | Express + Prisma + PostgreSQL | 5000 |

The frontend talks to the backend at `/api/api.php` (legacy-compatible routes).

---

## Prerequisites

- **PostgreSQL** database (e.g. [Neon](https://neon.tech), Supabase, or RDS)
- **Node.js 20+** (if not using Docker)
- Domain + HTTPS (recommended: Cloudflare or Nginx + Let's Encrypt)

---

## Environment variables

### Backend (`backend/.env`)

Copy `backend/.env.example` → `backend/.env`:

```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://...   # Neon / hosted Postgres connection string
JWT_SECRET=<long-random-string>
JWT_REFRESH_SECRET=<long-random-string>
CORS_ORIGIN=https://admin.yourdomain.com
```

Optional: Razorpay, WhatsApp, Fireconnect keys (see `.env.example`).

### Frontend

**`NEXT_PUBLIC_API_URL`** must point to your **public** backend URL:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/api.php
```

> `NEXT_PUBLIC_*` variables are embedded at **build time**. Rebuild the frontend after changing them.

Server-only secrets (Razorpay secret, WhatsApp token) go in the hosting dashboard for Next.js — see `.env.example`.

---

## Option A — Docker Compose (recommended for VPS)

Best for: DigitalOcean, AWS EC2, Hetzner, or any Linux server with Docker.

### 1. Prepare env files

```bash
cp .env.deploy.example .env.deploy
cp backend/.env.example backend/.env
# Edit both files with real values
```

In `.env.deploy`:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/api.php
CORS_ORIGIN=https://admin.yourdomain.com
```

### 2. Build and run

```bash
docker compose --env-file .env.deploy up -d --build
```

- Frontend: http://localhost:3000  
- Backend health: http://localhost:5000/health  
- API: http://localhost:5000/api/api.php

### 3. Seed admin user (first time)

```bash
docker compose exec backend npm run seed
```

Default login: `9999999999` / `password123` — **change passwords in production**.

### 4. Reverse proxy (production)

Put **Nginx** or **Caddy** in front:

| Subdomain | Target |
|-----------|--------|
| `admin.yourdomain.com` | `localhost:3000` |
| `api.yourdomain.com` | `localhost:5000` |

Enable HTTPS. Set `CORS_ORIGIN` to your admin URL.

---

## Option B — Split hosting (Vercel + Railway/Render)

### Frontend → Vercel

1. Import this repo in [Vercel](https://vercel.com).
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL` = your backend URL + `/api/api.php`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`, Fireconnect keys, etc.
   - Server secrets for `/api/*` routes (Razorpay, WhatsApp).
3. Deploy. Build command: `npm run build`, output: standalone (configured in `next.config.mjs`).

**Note:** PDF generation routes may hit serverless time/memory limits. For heavy PDF use, prefer Option A (VPS/Docker).

### Backend → Railway or Render

1. Deploy the `backend/` folder as a Node service.
2. Build: `npm ci && npx prisma generate && npm run build`
3. Start: `npx prisma db push && node dist/server.js`
4. Set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (your Vercel URL).

---

## Option C — Manual VPS (PM2)

### Backend

```bash
cd backend
npm ci
npx prisma generate
npx prisma db push
npm run build
npm run seed          # first time only
PORT=5000 NODE_ENV=production pm2 start dist/server.js --name purabiya-api
```

### Frontend

```bash
npm ci
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/api.php npm run build
PORT=3000 pm2 start npm --name purabiya-admin -- start
```

---

## Post-deploy checklist

- [ ] `DATABASE_URL` points to production Postgres (not local)
- [ ] Strong `JWT_SECRET` / `JWT_REFRESH_SECRET` (not defaults)
- [ ] `CORS_ORIGIN` matches your frontend URL exactly
- [ ] `NEXT_PUBLIC_API_URL` uses **HTTPS** in production
- [ ] Admin password changed after `npm run seed`
- [ ] Razorpay: use **live** keys only in production `.env`
- [ ] Never commit `.env` files with secrets to git

---

## Verify deployment

```bash
# Backend health
curl https://api.yourdomain.com/health

# Login test
curl -X POST "https://api.yourdomain.com/api/api.php?apicall=login" \
  -F "mobile=9999999999" -F "password=password123"
```

Open the admin URL, log in, and confirm dashboard lists load data.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Token missing" on all pages | Log out, clear localStorage, log in again (token must be saved on login) |
| CORS errors | Set `CORS_ORIGIN` in backend `.env` to your frontend origin |
| Empty lists / API fails | Check `NEXT_PUBLIC_API_URL` ends with `/api/api.php` |
| Build fails on frontend | Run `npm run build` locally and fix TypeScript errors first |
| Prisma errors on start | Run `npx prisma db push` against production `DATABASE_URL` |

---

## Quick commands reference

```bash
# Docker
docker compose --env-file .env.deploy up -d --build
docker compose logs -f backend
docker compose exec backend npm run seed

# Local dev
cd backend && npm run dev          # port 5000
npm run dev                        # port 3000 (set NEXT_PUBLIC_API_URL in .env)
```
