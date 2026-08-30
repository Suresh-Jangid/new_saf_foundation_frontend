# Deploy Backend Only on AWS

Host the **Express + Prisma API** (`backend/`) on AWS. Keep your frontend anywhere (Vercel, Firebase, local) — only point it at the API URL.

**API base path:** `https://<your-aws-url>/api/api.php`

---

## What you need

| Item | Example |
|------|---------|
| PostgreSQL | Neon, AWS RDS, or Supabase |
| AWS account | With permissions for App Runner or EC2 |
| Git repo | `backend/` folder committed (not in `.gitignore`) |

---

## Option A — AWS App Runner (recommended)

No servers to manage. Deploy from GitHub or Docker.

### A1. Deploy from GitHub (Dockerfile)

1. Push `backend/` to GitHub.
2. AWS Console → **App Runner** → **Create service**.
3. **Source:** Repository → connect GitHub → select repo.
4. **Root directory:** `backend`
5. **Build:** Dockerfile (uses `backend/Dockerfile`)
6. **Port:** `5000`
7. **Health check:** Path `/health`, protocol HTTP

### Environment variables (App Runner → Configuration → Environment)

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Yes | long random string |
| `JWT_REFRESH_SECRET` | Yes | long random string |
| `CORS_ORIGIN` | Yes | `https://your-admin.vercel.app` (comma-separated for multiple) |
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `5000` |
| `RAZORPAY_KEY_ID` | Optional | |
| `RAZORPAY_KEY_SECRET` | Optional | |

8. Create service. Note the URL, e.g. `https://abc123.us-east-1.awsapprunner.com`

### A2. Deploy from ECR (Docker image)

```bash
# From project root — AWS CLI configured
cd backend

# Create ECR repo (once)
aws ecr create-repository --repository-name purabiya-api --region ap-south-1

# Login, build, push
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

docker build -t purabiya-api .
docker tag purabiya-api:latest <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/purabiya-api:latest
docker push <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/purabiya-api:latest
```

Then App Runner → **Container registry** → select the ECR image → port `5000`.

---

## Option B — EC2 + Docker (lowest cost)

1. Launch **Ubuntu 22.04** EC2 (`t3.small`, open ports **22** and **5000** or use Nginx on 443).
2. Install Docker:

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

3. Clone repo, configure env:

```bash
git clone <your-repo>
cd purabiya-foundation-admin/backend
cp .env.example .env
nano .env   # set DATABASE_URL, JWT_*, CORS_ORIGIN
```

4. Build and run:

```bash
docker build -t purabiya-api .
docker run -d --name purabiya-api --restart unless-stopped -p 5000:5000 --env-file .env purabiya-api
```

5. (Recommended) Put **Nginx + Let's Encrypt** in front for HTTPS on `api.yourdomain.com`.

---

## Option C — ECS Fargate

Use when you need load balancing, auto-scaling, or VPC isolation.

1. Build & push image to **ECR** (same as A2).
2. Create ECS cluster → Fargate task definition:
   - Container port **5000**
   - Env vars from **Secrets Manager**
   - Health check: `GET /health`
3. Application Load Balancer → target group → ECS service.
4. ACM certificate on ALB for HTTPS.

---

## After deploy

### 1. Seed database (first time)

**App Runner / one-off task:**

```bash
# Locally with production DATABASE_URL
cd backend
DATABASE_URL="postgresql://..." npm run seed
```

Or EC2:

```bash
docker exec -it purabiya-api npm run seed
```

Default admin: `9999999999` / `password123` — **change immediately**.

### 2. Test API

```bash
curl https://YOUR-API-URL/health

curl -X POST "https://YOUR-API-URL/api/api.php?apicall=login" \
  -F "mobile=9999999999" \
  -F "password=password123"
```

### 3. Point your frontend

Wherever the admin UI is hosted:

```env
NEXT_PUBLIC_API_URL=https://YOUR-API-URL/api/api.php
```

Rebuild/redeploy the frontend after changing this.

---

## CORS

`CORS_ORIGIN` must include every frontend origin that calls the API:

```env
CORS_ORIGIN=https://admin.yourdomain.com,https://your-app.vercel.app
```

No trailing slash. Multiple origins = comma-separated.

---

## Uploads (agent photos, documents)

The API stores files in `backend/uploads/` on disk.

| Hosting | Note |
|---------|------|
| App Runner / ECS | Ephemeral disk — uploads lost on redeploy |
| EC2 + Docker volume | Persist with `-v uploads:/app/uploads` |
| Production | Plan migration to **S3** later |

For now, EC2 with a Docker volume is simplest if uploads matter.

---

## Security checklist

- [ ] Strong `JWT_SECRET` / `JWT_REFRESH_SECRET` (not defaults)
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require` on Neon/RDS)
- [ ] HTTPS on public API URL
- [ ] `CORS_ORIGIN` locked to your frontend only
- [ ] Change seed passwords after first login
- [ ] Never commit `backend/.env` to git

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| App Runner unhealthy | Check `/health` returns 200; port must be `5000` |
| Prisma error on start | Verify `DATABASE_URL`; run `prisma db push` locally against prod DB once |
| CORS blocked | Add exact frontend URL to `CORS_ORIGIN` |
| 401 Token missing | Frontend must send `Authorization: Bearer <token>` |
| Cold start slow | App Runner first request may be slow; consider min instances |

---

## Quick reference

```bash
# Local production test
cd backend
docker build -t purabiya-api .
docker run -p 5000:5000 --env-file .env purabiya-api

# Health
curl http://localhost:5000/health

# API
curl "http://localhost:5000/api/api.php?apicall=getAgents" -H "Authorization: Bearer <token>"
```
