# PTE CIP — Powertrain Engineering Capability Intelligence Platform

A full-stack skills/capability management platform for a powertrain engineering
organization. Dark-navy SaaS UI, role-based access, and a Supabase-hosted
PostgreSQL database.

- **Frontend:** Next.js 14 (App Router, JSX), Tailwind CSS, Recharts, lucide-react, SWR
- **Backend:** Node.js + Express REST API using `pg` (parameterized SQL, no ORM)
- **Database:** Supabase-hosted PostgreSQL (schema + seed provided)

```
ptecip/
├── client/     # Next.js app (JSX + Tailwind)
├── server/     # Express API
├── db/         # 01_schema.sql, 02_seed.sql, 03_demo_queries.sql, 04_mermaid_erd.md
└── README.md
```

---

## 1. Set up the database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run, in order:
   1. `db/01_schema.sql` — creates all 57 tables, views, triggers.
   2. `db/02_seed.sql` — loads demo data (Indian names, powertrain content).
   3. (optional) `db/03_demo_queries.sql` — sanity-check the screens' queries.
3. Get your connection string: **Project Settings → Database → Connection string →
   "Transaction pooler"**. It looks like:
   ```
   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```

---

## 2. Run the backend (`server/`)

```bash
cd server
npm install
cp .env.example .env      # then edit .env
npm run dev               # http://localhost:4000
```

**`server/.env`**

| Variable        | Description                                             |
| --------------- | ------------------------------------------------------- |
| `DATABASE_URL`  | Supabase **Transaction pooler** connection string       |
| `JWT_SECRET`    | Any long random string used to sign demo JWTs           |
| `DEMO_PASSWORD` | Shared demo login password (default `demo123`)          |
| `PORT`          | API port (default `4000`)                               |
| `CLIENT_ORIGIN` | Allowed CORS origin (default `http://localhost:3000`)   |

Health check: `GET http://localhost:4000/api/health`.

---

## 3. Run the frontend (`client/`)

```bash
cd client
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm run dev                        # http://localhost:3000
```

Open http://localhost:3000 → you'll be redirected to `/login`.

---
