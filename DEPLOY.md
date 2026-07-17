# Deploy runbook

Production setup and common operations for Tripinci. Stack:

- **Backend + Postgres**: Fly.io (`tripinci-api.fly.dev`).
- **Web**: Cloudflare Pages (`tripinci.pages.dev`).
- **CI/CD**: GitHub Actions (`.github/workflows/`).
- **Cost target**: $0/mes a hobby scale.

The deploy on `push to main` is automatic. The setup below is one-time.

---

## One-time setup

### 1. Backend on Fly.io

Install the CLI:

```bash
brew install flyctl
fly auth signup     # or `fly auth login` if you already have an account
```

Fly requires a credit card on the free tier; no charges unless you
exceed the allowances (3 shared-cpu-1x VMs, 3GB volume storage, 160GB
egress).

From the repo root:

```bash
cd backend

# Creates the app on Fly using the committed fly.toml.
# --no-deploy so we set secrets / DB before the first deploy.
fly launch --no-deploy --copy-config --name tripinci-api --region cdg

# Provision a Postgres cluster (uses one of the free VM slots).
fly postgres create \
  --name tripinci-db \
  --region cdg \
  --initial-cluster-size 1 \
  --vm-size shared-cpu-1x \
  --volume-size 1

# Attach the cluster to the API app — sets DATABASE_URL as a secret.
fly postgres attach tripinci-db --app tripinci-api

# Generate a strong JWT secret. Production MUST override the dev default.
fly secrets set \
  AUTH_SECRET="$(openssl rand -hex 32)" \
  CORS_ORIGINS="https://tripinci.pages.dev" \
  --app tripinci-api

# Unsplash key for trip cover images (GET /cover). Optional: without it
# covers just fall back to a gradient. It MUST live here and not in the
# frontend — EXPO_PUBLIC_* vars are inlined into the public web bundle.
fly secrets set UNSPLASH_ACCESS_KEY="<your-unsplash-access-key>" --app tripinci-api
```

First deploy:

```bash
fly deploy --app tripinci-api
curl https://tripinci-api.fly.dev/health    # → {"status":"ok"}
```

### 2. CI token for GitHub Actions

```bash
fly tokens create deploy -x 8760h --app tripinci-api
```

Copy the output and add it to GitHub:

`Settings` → `Secrets and variables` → `Actions` → `New repository secret`:

| Name             | Value                       |
| ---------------- | --------------------------- |
| `FLY_API_TOKEN`  | `<the token Fly printed>`   |

### 3. Web on Cloudflare Pages

Dashboard: <https://dash.cloudflare.com/?to=/:account/pages>.

- **Connect to Git** → pick this repo.
- **Production branch**: `main`.
- **Build settings**:
  - Build command: `cd app && npm install --legacy-peer-deps && npx expo export -p web`
  - Build output directory: `app/dist`
  - Root directory: leave at repo root.
- **Environment variables** (Production scope):
  - `EXPO_PUBLIC_API_URL=https://tripinci-api.fly.dev`
  - `NPM_FLAGS=--legacy-peer-deps`
  - `NODE_VERSION=22.13.0`
- Save and deploy.

Wait for the build to finish, then check `https://tripinci.pages.dev`.

### 4. End-to-end smoke

1. Open `https://tripinci.pages.dev` → it loads, fonts are Inter.
2. Register a user, log in, create a trip.
3. From the trip, generate an invite link. Open it incognito → log
   in / sign up with a different account → you land on the trip.

If CORS blocks anywhere, double-check `CORS_ORIGINS` matches the
exact Pages URL (no trailing slash, includes `https://`).

---

## Common operations

### Watch logs

```bash
fly logs --app tripinci-api
```

### Rotate the JWT secret

```bash
fly secrets set AUTH_SECRET="$(openssl rand -hex 32)" --app tripinci-api
```

Side-effect: all active tokens become invalid; every user has to log
in again. Use it if you suspect leakage.

### SSH into a running VM

```bash
fly ssh console --app tripinci-api
# then `psql $DATABASE_URL` to poke at the DB, or `python` to inspect
# settings, etc.
```

### Manual deploy

```bash
cd backend
fly deploy --remote-only
```

`--remote-only` builds on Fly's builders (fast, no local Docker needed).

### Run migrations manually

The standard deploy runs them automatically (`release_command` in
`fly.toml`). If a migration needs to be applied out-of-cycle:

```bash
fly ssh console --app tripinci-api -C "alembic upgrade head"
```

### Force the web to rebuild after env var change

CF Pages dashboard → project → Deployments → most recent → "Retry
deployment". A normal `git push` also triggers a rebuild.

### Backup Postgres (manual)

Free tier doesn't include automatic backups. Snapshot a volume on demand:

```bash
fly volumes list --app tripinci-db
fly volumes snapshots create <volume-id> --app tripinci-db
fly volumes snapshots list <volume-id> --app tripinci-db
```

Restore: create a new volume from a snapshot, swap into the app.
Procedure documented at <https://fly.io/docs/postgres/managing/snapshots/>.

When the data starts to matter, migrate to a managed offering (Neon,
Fly's managed PG, etc.) for automatic backups.

### Scale up

CPU / memory:

```bash
fly scale memory 512 --app tripinci-api      # 256 → 512 MB
fly scale vm shared-cpu-2x --app tripinci-api
```

Horizontal:

```bash
fly scale count 2 --app tripinci-api          # adds a second region or a replica
```

Avoid running multiple machines until `release_command` succeeds and
the API is stateless across them (we are today: JWT is stateless, no
in-process queues).

---

## Future: enable the PRE environment

Architected but not deployed yet. Steps when you want it on:

1. `cp backend/fly.toml backend/fly.pre.toml` and rename the `app` and
   adjust any region.
2. `fly launch --no-deploy --copy-config --config fly.pre.toml --name tripinci-api-pre --region cdg`.
3. `fly postgres create --name tripinci-db-pre ...` and attach to the
   pre app.
4. Generate secrets for `-pre`: a distinct `AUTH_SECRET`, plus
   `CORS_ORIGINS=https://develop.tripinci.pages.dev`.
5. Add a `deploy-pre` job to `.github/workflows/backend.yml`, gated on
   the `develop` branch.
6. In Cloudflare Pages, configure the **preview branch** to `develop`
   with `EXPO_PUBLIC_API_URL=https://tripinci-api-pre.fly.dev`.

---

## Cost watch

Free tier covers everything at hobby scale. Things that push you off:

- **Postgres > 1GB stored**: free PG has 1GB. Either bump the volume
  (paid) or migrate to Neon (3GB free).
- **API egress > 160GB/mes**: unlikely until you have real traffic.
- **CI minutes > 2000/mes** on private repos.

Set a Fly spending notification:

```bash
fly orgs billing notification-email set you@example.com
```
