# Deployment Guide — Varify Product Options

Complete, ordered steps to deploy on a **single DigitalOcean Droplet** and publish to the
**Shopify App Store**.

- **Domain:** `apppov.pistalix.in`
- **Storage:** DigitalOcean Spaces (`king-vid`, region `sgp1`)
- **Database:** SQLite on a persistent Docker volume
- **HTTPS:** Caddy (automatic Let's Encrypt)

---

## PART A — Prerequisites (do once, on your own machine)

### A1. Push the code to a Git remote
You need the repo reachable from the droplet.
```bash
git add .
git commit -m "Production deploy: Spaces, Docker, Caddy, GDPR webhooks, backups"
git push origin main
```
> Private repo? Either make a deploy key, or use the `scp` method in **Appendix B**.

### A2. Get your Shopify credentials ready
From the **Shopify Partner Dashboard → your app → Configuration / API credentials**:
- **Client ID (API key):** `07a0a225a28e52758463e6995952b30b`
- **Client secret (API secret):** _copy it_

You also need the **cart-price-override Function ID** — you'll get this in **Part D**.

---

## PART B — DigitalOcean Setup

### B1. Confirm the Space (already created)
- Bucket: `king-vid`, Region: `sgp1` (verified).
- Space settings → **File Listing: Restricted** (keep it this way).
- *(Recommended)* Enable the **CDN** on the Space (free, faster).
- *(Recommended)* Space → **Lifecycle rules** → expire prefix `varify-product-options/backups/`
  after 30 days (auto-prunes old DB backups).

### B2. Create the Droplet
1. DO → **Create → Droplet** → Region **Singapore (SGP1)** (same region as the Space).
2. Image: **Ubuntu 24.04 LTS**.
3. Size: **Basic → Regular → $6/mo (1 GB)** recommended. $4/mo (512 MB) also works *because we
   add swap below*.
4. Authentication: add your **SSH key**.
5. Create, then copy the droplet's **public IP**.

### B3. Point the domain at the droplet
At your DNS host for `pistalix.in`, add an **A record**:
- **Host/Name:** `apppov`
- **Value:** `<droplet public IP>`
- **TTL:** 300

Verify (wait a few minutes):
```bash
nslookup apppov.pistalix.in     # must return the droplet IP
```
> Caddy can't issue the HTTPS certificate until this resolves correctly.

### B4. Prepare the server
SSH in: `ssh root@<droplet IP>`, then run:
```bash
# Swap (prevents build out-of-memory on small droplets) — skip only on 2GB+ droplets
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Docker + Compose plugin + git
apt-get update && apt-get install -y docker.io docker-compose-v2 git
systemctl enable --now docker

# Basic firewall
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

### B5. Get the code onto the droplet
```bash
git clone <your-repo-url> /opt/pistalix
cd /opt/pistalix
```

### B6. Create the `.env` file
```bash
cp .env.example .env
nano .env
```
Fill in (leave `DATABASE_URL` as-is — Compose overrides it to the volume path):
```
SHOPIFY_API_KEY=07a0a225a28e52758463e6995952b30b
SHOPIFY_API_SECRET=<your client secret>
SHOPIFY_APP_URL=https://apppov.pistalix.in
SCOPES=read_cart_transforms,read_draft_orders,read_files,write_cart_transforms,write_draft_orders,write_files,write_metaobject_definitions,write_metaobjects,write_products
SHOPIFY_CART_PRICE_OVERRIDE_ID=        # fill after Part D

DATABASE_URL=file:./dev.sqlite         # ignored in Docker; compose sets the real path

SPACES_KEY=DO00YEBCK78U64PTD4VK
SPACES_SECRET=0pVRggtbSkPt7tdh9FjjXcaJPn3YnyY5zURM7B7VSys
SPACES_REGION=sgp1
SPACES_ENDPOINT=https://sgp1.digitaloceanspaces.com
SPACES_BUCKET=king-vid
SPACES_CDN_URL=https://king-vid.sgp1.digitaloceanspaces.com
SPACES_FOLDER=varify-product-options
```
Save (Ctrl+O, Enter, Ctrl+X).

### B7. Launch
```bash
docker compose up -d --build      # first build takes a few minutes
docker compose logs -f app        # watch: "migrate deploy" then server start; Ctrl+C to stop tailing
```
Open **https://apppov.pistalix.in** in a browser — Caddy issues the TLS cert on first hit
(give it ~30s). You should see a Shopify auth/login screen (not the app itself yet — that's normal
until installed from Shopify).

### B8. Verify persistence
```bash
docker compose restart app
```
Data survives because SQLite lives on the `sqlite_data` volume. ✅

---

## PART C — Set up backups (on the droplet)

Test the backup once now:
```bash
cd /opt/pistalix && docker compose exec -T app node scripts/backup-db.mjs
# expect: "Backup uploaded: s3://king-vid/varify-product-options/backups/..."
```
Schedule it daily (3 AM):
```bash
crontab -e
```
Add:
```
0 3 * * * cd /opt/pistalix && docker compose exec -T app node scripts/backup-db.mjs >> /var/log/pistalix-backup.log 2>&1
```

---

## PART D — Push app config & extensions to Shopify (from your machine)

```bash
npm install          # if you haven't already
npm run deploy       # = shopify app deploy
```
This pushes `shopify.app.toml` (URLs + GDPR compliance webhooks), the **Functions**, and the
**theme app extension**.

After it completes:
1. Find the **cart-price-override Function ID** (in the deploy output, or Partner Dashboard →
   your app → Extensions → the function).
2. On the droplet, put it in `.env` as `SHOPIFY_CART_PRICE_OVERRIDE_ID=...`, then:
   ```bash
   cd /opt/pistalix && docker compose up -d      # reloads env, no rebuild needed
   ```

---

## PART E — Verify the app in the Partner Dashboard

Partners → your app → **Configuration**. Confirm:
- **App URL:** `https://apppov.pistalix.in`
- **Allowed redirection URL(s):** `https://apppov.pistalix.in/auth/callback`
- **App proxy:** subpath `product-options`, prefix `apps`, URL `https://apppov.pistalix.in`
- **Compliance webhooks:** point to `https://apppov.pistalix.in/webhooks/compliance`
  (auto-set by `npm run deploy`).

---

## PART F — Install & smoke-test on a development store

1. Partners → your app → **Test your app** → select/create a **development store** → install.
2. Confirm OAuth completes and the app loads **embedded** in Shopify admin.
3. **Upload an image** inside an option set → confirm it appears, and that its URL is
   `https://king-vid.sgp1...digitaloceanspaces.com/varify-product-options/...`.
4. Open the Space dashboard → confirm the file is under `varify-product-options/<shop>/`.
5. On the storefront: confirm the option widget renders and the **cart price override** works.
6. Uninstall + reinstall once to confirm the lifecycle is clean.

---

## PART G — Rotate the Spaces key (security)

The current Spaces key was shared during setup. Once uploads work in production:
1. DO → **API → Spaces Keys → Generate New Key**.
2. Update `SPACES_KEY` / `SPACES_SECRET` in the droplet `.env`.
3. `cd /opt/pistalix && docker compose up -d`.
4. Delete the old key in DO.

---

## PART H — Submit to the Shopify App Store

Partners → your app → **Distribution → Shopify App Store → Create listing**.

Checklist Shopify reviewers require:
- [ ] App icon, screenshots, description, category.
- [ ] **Pricing** set (matches your Billing API plans).
- [ ] **Privacy policy URL** and support contact.
- [ ] OAuth works on a fresh install (tested in Part F).
- [ ] **Mandatory compliance webhooks** respond (implemented at `/webhooks/compliance`).
- [ ] App uses **session tokens / embedded auth** (already configured).
- [ ] A **demo store** or screencast showing the core flow.

Then click **Submit for review**. Shopify review typically takes several business days; they may
reply with change requests — address and resubmit.

---

## Day-2 operations (cheat sheet)

```bash
# Deploy new code
cd /opt/pistalix && git pull && docker compose up -d --build

# Logs
docker compose logs -f app
docker compose logs -f caddy        # TLS / proxy issues

# Restart / stop
docker compose restart app
docker compose down                 # stop everything (data on volume is kept)

# Manual backup
docker compose exec -T app node scripts/backup-db.mjs

# Restore a backup (DANGER: overwrites current DB)
#  1) download the .sqlite from Spaces  2) docker compose down
#  3) copy it into the volume as prod.sqlite  4) docker compose up -d
```

---

## Appendix B — Copying code without Git
From your machine (PowerShell), if you can't use git:
```powershell
# Exclude node_modules/build/.env — rebuild happens on the server
scp -r (Get-ChildItem -Path . -Exclude node_modules,build,.cache,.env) root@<IP>:/opt/pistalix/
```
Then continue from **B6**.

---

## Cost summary (monthly)
| Item | Cost |
|---|---|
| Droplet (1 GB) | ~$6 (or ~$4 for 512 MB + swap) |
| Spaces (250 GB min) | $5 |
| **Total** | **~$11/mo** |
