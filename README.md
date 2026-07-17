# 🐘 Self-Service PostgreSQL Platform

A full-stack platform that lets developers spin up their own isolated PostgreSQL databases on demand — no manual installation, no DBA required. Sign up, click **Create**, and get a ready-to-use connection string in seconds.

Built to demonstrate core **Platform Engineering** skills: infrastructure automation, containerization, API design, and cloud deployment.

**🔗 Live Demo:** [http://18.227.177.149](http://18.227.177.149)
**📦 Repository:** [github.com/ZubairSolanki/postgres-self-service-platform](https://github.com/ZubairSolanki/postgres-self-service-platform)

---

## 📸 Screenshots

| Login | Dashboard | Database Detail |
|---|---|---|
| ![Login](postgres-self-image-1.png) | ![Dashboard](postgres-self-image-1.png) | ![Database Detail](postgres-self-image-1.png) |

---

## ✨ Features

- **🔐 Authentication** — secure signup/login with JWT and bcrypt password hashing
- **⚡ One-click database provisioning** — creates a real, isolated PostgreSQL database and dedicated user automatically, named from the account owner
- **🗑️ Database lifecycle management** — list, delete (with soft-delete history), and manage owned databases
- **🔑 Password rotation** — reset a database's credentials instantly without losing any data
- **💾 Backup & restore** — full `pg_dump`/`pg_restore` support, timestamped backups, one-click restore
- **⬇️ Backup download** — export any backup as a portable `.sql` file
- **📤 Restore from a local file** — upload any `.sql` file and restore it directly onto a live database
- **📊 Usage insights** — live database size and active connection count per database
- **📝 Audit logging** — every create, delete, backup, restore, and password reset is logged for traceability
- **🛡️ Strict ownership enforcement** — users can only ever see or modify their own databases, verified server-side on every request

---

## 🤔 What Problem This Actually Solves

It's a fair question: *"If a developer still needs to install a PostgreSQL client to connect, what does this platform actually save them?"*

The answer: this platform doesn't try to eliminate a small, one-time **client** install — it eliminates the need to build and operate an entire database **server**.

| Without this platform | With this platform |
|---|---|
| Install and configure a full PostgreSQL server (`postgresql.conf`, `pg_hba.conf`, memory tuning, ports) | Already running, fully managed |
| Manually create databases and roles via SQL | One click, auto-provisioned |
| Build your own backup strategy (cron jobs, storage, scripts) | Built-in, one click |
| Script your own credential rotation | Built-in, one click |
| Provision a cloud server and configure networking just to make it reachable from anywhere | Already live on a public IP |
| Build your own usage/connection monitoring | Built-in dashboard |

**The analogy:** a PostgreSQL client (`psql`) is a key. This platform is the house — built, wired, and already standing. Installing a key is trivial; building the house is the actual hard part, and that's the part this platform automates. It's a simplified version of the same problem AWS RDS, Supabase, and Neon solve.

---

## 🔌 Connecting to a Database You Create

Every database you provision returns a ready-to-use connection string, e.g.:

```
postgresql://user_zubair:xxxxxxxx@18.227.177.149:5432/mydb
```

### Option 1 — Use it directly in application code (no extra install needed)

Most real usage looks like this — plug the string straight into your app's database library:

```js
// Node.js
const { Pool } = require('pg')
const pool = new Pool({ connectionString: 'postgresql://...' })
```

```python
# Python
import psycopg2
conn = psycopg2.connect("postgresql://...")
```

### Option 2 — Browse it visually with a GUI tool

Tools like **DBeaver**, **TablePlus**, or **pgAdmin (desktop)** connect using the same connection string — no command-line install required.

### Option 3 — Connect via `psql` (command-line access)

This is the only option that requires installing something locally first — a lightweight PostgreSQL **client**, not a server.

| OS | Install command |
|---|---|
| Windows | Download from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) → select **Command Line Tools** during setup |
| macOS | `brew install postgresql@16` |
| Ubuntu/Debian | `sudo apt install postgresql-client` |
| Fedora/RHEL | `sudo dnf install postgresql` |

Verify the install:
```bash
psql --version
```

Then connect using the credentials from your dashboard:
```bash
psql -h 18.227.177.149 -U user_dipesh -d mydbtodo
```

This is a small, one-time setup — trivial compared to installing, configuring, and operating a full Postgres **server**, which is the actual problem this platform removes.

---

## 🏗️ Architecture

```
┌─────────────┐        ┌──────────────┐        ┌─────────────────┐
│   React     │  REST  │   Express    │  SQL   │   PostgreSQL     │
│  (Nginx)    │ ─────► │   (Node.js)  │ ─────► │   (Docker)       │
│  Port 80    │        │  Port 4000   │        │   Port 5432      │
└─────────────┘        └──────────────┘        └─────────────────┘
                               │
                               ├── JWT auth middleware
                               ├── pg_dump / pg_restore (backups)
                               └── audit_logs (every action tracked)
```

All three services run as independent Docker containers, orchestrated with a single `docker-compose.yml`, and deployed on an AWS EC2 instance with a static Elastic IP. PostgreSQL's port (5432) is exposed publicly so databases created through the platform are reachable from any external application — not just from inside Docker.

---

## 🛠️ Tech Stack

**Frontend:** React, React Router, Tailwind CSS, Axios, Vite
**Backend:** Node.js, Express, node-postgres (`pg`), JWT, bcrypt, Multer
**Database:** PostgreSQL 16
**Infrastructure:** Docker, Docker Compose, Nginx, AWS EC2 (Elastic IP)

---

## 🔒 Security Design

- Passwords hashed with **bcrypt** — raw passwords are never stored
- All protected routes require a valid **JWT**, verified server-side on every request
- User identity is always derived from the verified token, **never** trusted from request input
- Ownership checks run before every destructive action (delete, backup, restore, reset password)
- Database/user names are sanitized against a strict allow-list pattern before being used in raw SQL, preventing injection on identifiers that can't be parameterized
- Generated database credentials use random, high-entropy passwords
- Secrets (`.env`, JWT secret, DB credentials) are excluded from the Docker image and Git history

---

## 📂 Project Structure

```
postgres-self-service-platform/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── db/schema.sql
│   └── src/
│       ├── index.js
│       ├── db.js
│       ├── middleware/authMiddleware.js
│       ├── routes/ (auth, databases, backups)
│       └── utils/sanitize.js
└── frontend/
    ├── Dockerfile
    └── src/
        ├── api/client.js
        ├── context/AuthContext.jsx
        ├── components/ (ProtectedRoute, ConnectionTerminal, StatusBadge)
        └── pages/ (Login, Signup, Dashboard, DatabaseDetail)
```

---

## 🚀 Running Locally

**Prerequisites:** Docker Desktop

```bash
git clone https://github.com/ZubairSolanki/postgres-self-service-platform.git
cd postgres-self-service-platform
docker compose up -d --build
```

This starts all three services — PostgreSQL, backend API, and frontend — with the database schema created automatically on first run.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend health check | http://localhost:4000/health |

---

## 📡 API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create an account |
| POST | `/api/auth/login` | Log in, returns a JWT |
| POST | `/api/databases/create` | Provision a new database |
| GET | `/api/databases` | List your databases |
| GET | `/api/databases/:dbName/usage` | Database size & connection count |
| POST | `/api/databases/:dbName/reset-password` | Rotate database credentials |
| DELETE | `/api/databases/:dbName` | Delete a database |
| POST | `/api/backups/:dbName` | Create a backup |
| GET | `/api/backups/:dbName` | List backups |
| POST | `/api/backups/:dbName/restore/:fileName` | Restore from a platform-created backup |
| POST | `/api/backups/:dbName/restore-upload` | Restore from an uploaded local `.sql` file |
| GET | `/api/backups/:dbName/download/:fileName` | Download a backup file |

All routes except signup/login require an `Authorization: Bearer <token>` header.

---

## ☁️ Deployment

Deployed on an **AWS EC2** instance (Ubuntu 24.04), running the full Docker Compose stack directly on the server, with a static **Elastic IP** so the public address never changes across restarts.

```bash
# On the server
git clone <repo>
cd postgres-self-service-platform
docker compose up -d --build
```

**Verified with a real external app:** a separate Node.js + React Todo application was built and connected to a database provisioned entirely through this platform, using nothing but the generated connection string — confirming the platform works for genuine external use, not just internal testing.

---

## 💡 What This Project Demonstrates

- Designing and provisioning real infrastructure (databases and roles) through an API, not just CRUD over static data
- Multi-container orchestration with Docker Compose, including health checks and service dependencies
- Secure-by-default API design: token-based identity, ownership enforcement, input sanitization for non-parameterizable SQL
- Operational database management: backup/restore workflows (including file upload) and credential rotation
- End-to-end cloud deployment: EC2 provisioning, security groups, and static IP configuration
- Distinguishing internal (container-to-container) networking from public-facing hostnames when generating credentials for external consumers

---

## 👤 Author

**Zubair Solanki**
[GitHub](https://github.com/ZubairSolanki) · [LinkedIn](#)
