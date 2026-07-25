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
├── db/         # 01_schema.sql, 02_seed.sql, 03_demo_queries.sql, 04_mermaid_erd.md,
│              # 05_profile_cv.sql
└── README.md
```

---

## 1. Set up the database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run, in order:
   1. `db/01_schema.sql` — creates all tables, views, triggers.
   2. `db/02_seed.sql` — loads demo data (Indian names, powertrain content).
   3. `db/05_profile_cv.sql` — profile/CV tables + the verification approval type.
      Additive and idempotent; safe on an already-seeded database.
   4. (optional) `db/03_demo_queries.sql` — sanity-check the screens' queries.
3. Get your connection string: **Project Settings → Database → Connection string →
   "Transaction pooler"**. It looks like:
   ```
   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
4. For profile pictures, open **Storage → New bucket**, name it `avatars` and mark
   it **Public**. Uploads are refused with a clear message until this exists.

---

## 2. Run the backend (`server/`)

```bash
cd server
npm install
cp .env.example .env      # then edit .env
npm run dev               # http://localhost:4000
```

**`server/.env`**

| Variable                        | Description                                             |
| ------------------------------- | ------------------------------------------------------- |
| `DATABASE_URL`                  | Supabase **Transaction pooler** connection string       |
| `JWT_SECRET`                    | Any long random string used to sign demo JWTs           |
| `DEMO_PASSWORD`                 | Shared demo login password (default `demo123`)          |
| `PORT`                          | API port (default `4000`)                               |
| `CLIENT_ORIGIN`                 | Allowed CORS origin (default `http://localhost:3000`)   |
| `SUPABASE_URL`                  | Project URL — **Project Settings → API**                |
| `SUPABASE_SERVICE_ROLE_KEY`     | `service_role` secret; server-side only, never shipped to the browser |
| `SUPABASE_STORAGE_BUCKET`       | Public bucket for profile pictures (default `avatars`)  |

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
| My Profile / CV      | `/profile`         | Talent profile (CV + verification) |

Additional: `/roles` (role list), `/search`, `/assessments` (capability pipeline),
`/employees` (directory + Add Employee), `/login`.

---

## 5a. Profile / CV and verification

Every signed-in user gets a self-service CV on `/profile` (the same component
renders read-only for anyone else at `/employees/[id]`).

- **Edit Profile** — headline, professional summary, phone, location, LinkedIn,
  plus add/edit/remove **experience** and **education** rows. Everything is typed
  in by hand; there is no CV file upload.
- **Profile picture** — the only real file upload. Goes to the Supabase Storage
  bucket; the public URL is saved on `employees.photo_url`.
- **Add Skill** — search the skill library or type a skill that doesn't exist yet
  (it gets created), then set your own level 1–5. Stored as an
  `employee_skill_assignments` link plus a `Self` row in `skill_assessments`, so
  the Skills Passport and `v_employee_skill_matrix` pick it up unchanged.
  A skill a manager or mentor has already assessed can't be removed from here.
- **Request Verification** — search for *anyone* in the directory and send them a
  request. It becomes an `approvals` row (`Profile Verification`) plus an inbox
  item for them. They **Approve** or **Reject** from *Inbox → Pending Approvals*;
  the result is written back as a `Verified` / `Rejected` badge on the profile and
  a notice in the requester's inbox.
- Editing any CV detail afterwards drops the profile back to **Not Verified** and
  cancels a still-pending request, so verification always refers to what was
  actually reviewed.

**Add Employee** (`/employees`) is open to `admin`, `executive` and
`department_head`.

---

## 6. Verifying against `db/03_demo_queries.sql`

- **Query #4** (Jasleen's skill passport) → Jasleen Kaur → *Skills Passport* tab.
- **Query #5/#6** (Gurpreet's mentor dashboard) → Gurpreet Singh → *Mentor Dashboard*.
- **Query #8** (Jasleen's Kanban) → Jasleen Kaur → *Learning Plan*.

---

## API reference (all under `/api`, JWT required except `/auth`)

`POST /auth/login` · `GET /auth/personas` · `GET /dashboard/executive` ·
`GET /skills` `GET /skills/:id` `POST /skills` `GET /skills/categories` `GET /skills/labels` ·
`GET /roles` `GET /roles/:id` ·
`GET /employees` `POST /employees` `GET /employees/form-options` `GET /employees/:id/profile` ·
`PUT /employees/:id/cv` `POST /employees/:id/photo` ·
`POST /employees/:id/experience` `PUT|DELETE /employees/:id/experience/:expId` ·
`POST /employees/:id/education` `PUT|DELETE /employees/:id/education/:eduId` ·
`POST /employees/:id/skills` `DELETE /employees/:id/skills/:skillId` ·
`POST /verification/request` `POST /verification/:id/decision` ·
`GET /training` `GET /training/:id` `POST /training` ·
`GET /learning-plan/:employeeId` `PATCH /learning-plan/items/:id` ·
`GET /mentor/:mentorId/dashboard` · `GET /certifications` · `GET /roadmap` ·
`GET /inbox` `GET /inbox/count` `GET /inbox/approvals` `PATCH /inbox/:id/read` ·
`GET /course-development` `GET /course-development/:id` ·
`GET /admin/users` `GET /admin/audit-logs` `GET /admin/permission-roles` `GET /admin/settings`
