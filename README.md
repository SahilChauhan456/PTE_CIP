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

## 4. Demo personas

All personas share the password **`demo123`**. The sidebar and data adapt to the
persona's role.

| Persona              | Email                             | Role                     | Sees                                            |
| -------------------- | --------------------------------- | ------------------------ | ----------------------------------------------- |
| Rahul Sharma         | `rahul.sharma@ptecip.local`       | Executive                | Dashboard, Analytics/Roadmap                    |
| Neha Verma           | `neha.verma@ptecip.local`         | Department Head          | Dashboard, Assessments, Analytics               |
| Shalini Srivastava   | `shalini.srivastava@ptecip.local` | Manager                  | Team assessments, approvals                     |
| Gurpreet Singh       | `gurpreet.singh@ptecip.local`     | Mentor / SME             | **Mentor Dashboard** with his mentees           |
| Moumita Bose         | `moumita.bose@ptecip.local`       | SME / Mentor             | Mentors & SMEs, capability pipeline             |
| Nidhi Tripathi       | `nidhi.tripathi@ptecip.local`     | Training Coordinator / **Admin** | Admin Settings, training operations     |
| Jasleen Kaur         | `jasleen.kaur@ptecip.local`       | Employee                 | Her **Skills Passport** & **Learning Plan**     |

---

## 5. Pages ↔ mockups

| Page                 | Route              | Mockup                          |
| -------------------- | ------------------ | ------------------------------- |
| Executive Dashboard  | `/dashboard`       | Slide 1 (KPIs, coverage, heatmap) |
| Skills Library       | `/skills`          | Slide 2                         |
| Skill Detail         | `/skills/[id]`     | Slide 3 (tabs + Analytics)      |
| Role Detail          | `/roles/[id]`      | Slide 5 (mandatory skills, readiness) |
| Employee Profile     | `/employees/[id]`  | Slide 6 (passport, learning)    |
| Training Catalog     | `/training`        | Slide 7                         |
| Mentor Dashboard     | `/mentor`          | Slide 10                        |
| Learning Plan Kanban | `/learning-plan`   | Slide 9 (drag-and-drop)         |
| Certification Tracker| `/certifications`  | Slide 13                        |
| Future Skills Roadmap| `/roadmap`         | Slide 15                        |
| Admin Settings       | `/admin`           | Slide 16                        |
| Inbox                | `/inbox`           | —                               |

Additional: `/roles` (role list), `/search`, `/assessments` (capability pipeline),
`/login`.

---

## 6. Verifying against `db/03_demo_queries.sql`

- **Query #4** (Jasleen's skill passport) → Jasleen Kaur → *Skills Passport* tab.
- **Query #5/#6** (Gurpreet's mentor dashboard) → Gurpreet Singh → *Mentor Dashboard*.
- **Query #8** (Jasleen's Kanban) → Jasleen Kaur → *Learning Plan*.

---

## API reference (all under `/api`, JWT required except `/auth`)

`POST /auth/login` · `GET /auth/personas` · `GET /dashboard/executive` ·
`GET /skills` `GET /skills/:id` `POST /skills` `GET /skills/categories` `GET /skills/labels` ·
`GET /roles` `GET /roles/:id` · `GET /employees` `GET /employees/:id/profile` ·
`GET /training` `GET /training/:id` `POST /training` ·
`GET /learning-plan/:employeeId` `PATCH /learning-plan/items/:id` ·
`GET /mentor/:mentorId/dashboard` · `GET /certifications` · `GET /roadmap` ·
`GET /inbox` `GET /inbox/count` `GET /inbox/approvals` `PATCH /inbox/:id/read` ·
`GET /course-development` `GET /course-development/:id` ·
`GET /admin/users` `GET /admin/audit-logs` `GET /admin/permission-roles` `GET /admin/settings`
