# Varify Product Options Variant - Shopify App Documentation

## Non-Technical Info

### Project Overview
Varify Product Options Variant is a powerful Shopify application designed to help merchants bypass Shopify's default variant limits (typically 100 variants and 3 options per product). It allows store owners to create unlimited custom product options—such as text inputs, file uploads, color swatches, dropdowns, and checkboxes—and apply them to products across their storefront. By empowering merchants to offer highly customizable products, the app solves the problem of restrictive product configuration out-of-the-box, leading to enhanced shopping experiences and increased conversion rates.

### Key Features
- **Unlimited Custom Options:** Create specialized input fields for products (e.g., Text, Dropdown, Checkbox, File Upload, Color Swatches, Image Swatches).
- **Template & Option Set Builder:** Build reusable option sets and templates that can be assigned to multiple products or collections simultaneously.
- **Conditional Logic:** Show or hide specific options based on what the customer has already selected, creating dynamic and responsive product pages.
- **Live Storefront Preview:** A real-time preview interface within the admin panel that shows exactly how options will appear and behave on the actual storefront.
- **Add-on Pricing:** Assign additional costs to specific custom options, which are automatically calculated and added to the base product price.
- **Drag-and-Drop Editor:** Easily reorder elements, sections, and values within the admin dashboard using an intuitive drag-and-drop interface.

### Option Templates
The app includes a robust Option Templates library to help merchants quickly set up product options:
- **Pre-Designed Templates:** Ready-to-use configurations for common products (e.g., Glasses, Keychains, Bracelets, Mugs).
- **Personalized Templates:** Tailored templates for personalized items like custom photo frames or custom mugs.
- **Custom Templates:** A dedicated space for merchants to create, save, manage, and edit their own custom-built option sets.
These templates significantly streamline the setup process and ensure consistent configurations across the catalog.

### Target Audience / Use Cases
- **Merchants selling customizable goods:** e.g., engraved jewelry, custom-printed apparel, personalized gifts.
- **B2B or Wholesale stores:** Requiring complex file uploads (like logos) or extensive configuration options.
- **Stores with complex product catalogs:** Any merchant who finds Shopify's native 100-variant limit too restrictive for their product offerings.

---

## Storefront Setup (Theme Integration)

To display your custom product options on the storefront, you must enable the App Embed and add the App Block within your Shopify Theme Editor.

### Step 1: Enable the App Embed (Core Scripts)
1. Go to your Shopify Admin and navigate to **Online Store > Themes**.
2. Click **Customize** on your active theme.
3. On the left sidebar, click the **App embeds** icon (it looks like a block with a gear).
4. Find **Varify Product Options Variant Core** (or similar) in the list and toggle the switch to **ON**.
5. Click **Save** in the top right corner.

### Step 2: Add the App Block to Product Pages
1. While still in the Theme Editor, use the top dropdown menu to navigate to **Products > Default product** (or whichever product template you wish to modify).
2. On the left sidebar, click **Add block** within the **Product information** section.
3. Look under the **Apps** category and select the **PistaLix Product Options** block.
4. Drag and drop the block to place it exactly where you want the custom options to appear (usually right above the "Add to cart" button or Quantity selector).
5. Click **Save** in the top right corner.

---

## Technical Info

### Technology Stack
- **Frontend (Admin Dashboard):** React, Shopify Polaris (for native Shopify UI/UX styling), `@dnd-kit` (for drag-and-drop functionality).
- **Backend & Routing:** React Router (v7) / Remix architecture, Node.js.
- **Database & ORM:** Prisma ORM, utilizing SQLite (for development) or PostgreSQL/MySQL (for production), coupled with Shopify App Session Storage.
- **Build Tooling:** Vite (for fast HMR and compilation), TypeScript (partially, for type-checking and code gen), ESLint/Prettier.
- **Integrations:** Shopify Admin GraphQL API, Shopify REST API.

### Architecture & System Design
- **Admin App (Embedded):** The app is embedded directly within the Shopify Admin using `@shopify/app-bridge-react`. It relies on React Router's loaders and actions to fetch and mutate data seamlessly without full page reloads.
- **Data Model:** Prisma is used to model entities like `OptionSet`, `Template`, and individual `Element` components. Configurations (like width, placeholders, min/max limits) are stored as JSON within the database to maintain schema flexibility.
- **State Management:** Local component state (`useState`, `useReducer`) is combined with React Router's `useFetcher` and `useSubmit` for optimistic UI updates and server synchronization.
- **Storefront Extension:** While the admin manages the configuration, a separate Shopify App Extension (App Block) typically injects these options into the merchant's theme on the product page.
- **Dynamic Rendering:** The `ElementRenderer` component dynamically maps JSON configuration data from the database into fully functional React components in the admin preview.

### Prerequisites & Installation
To run this project locally, ensure you have the following installed:
- Node.js (v20.19+ or v22.12+)
- npm (or yarn/pnpm)
- A Shopify Partner account with a development store.

**Step-by-step Setup:**
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd pistalix-globo
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Database Setup:**
   Generate the Prisma client and push the schema to your local database:
   ```bash
   npm run setup
   ```
4. **Link to Shopify:**
   Link your local codebase to your Shopify Partner app:
   ```bash
   npm run config:link
   ```
5. **Start the Development Server:**
   This will start Vite, tunnel your local server via Cloudflare, and provide an installation link:
   ```bash
   npm run dev
   ```

### Usage / API Endpoints
Since this is a Remix/React-Router based application, data fetching and mutations are handled via Route `loader` and `action` functions rather than traditional REST endpoints.

- **Loaders (GET):** 
  - Accessed automatically by React Router when navigating to a page (e.g., `/app/option-sets/:id` loads the specific Option Set data from the database).
- **Actions (POST/PUT/DELETE):** 
  - Triggered via `<Form>` submissions or `useFetcher()`.
  - Example: Submitting the Option Set Builder form sends a `POST` request to the current route's action, which validates the JSON payload and updates the Prisma database.
- **GraphQL / Shopify API:**
  - The app communicates with Shopify's backend using the authenticated session context (via `shopify.server.js`) to query products, collections, and manage App blocks.

---

## Production Deployment

The app is deployed on a **single DigitalOcean Droplet** running Docker Compose, with **Caddy**
for automatic HTTPS, **SQLite on a persistent volume**, and **DigitalOcean Spaces** for file
uploads.

- **Domain:** `apppov.pistalix.in`
- **Storage:** DigitalOcean Spaces (`king-vid`, region `sgp1`)
- **Estimated cost:** ~$6/mo droplet + $5/mo Spaces ≈ **$11/mo**

> A copy of this guide also lives in [`DEPLOY.md`](./DEPLOY.md).

### Guide 1 — DigitalOcean (server + storage)

#### 1.1 Push the code to a Git remote
```bash
git add .
git commit -m "Production deploy"
git push origin main
```

#### 1.2 Confirm the Space
- Bucket `king-vid`, region `sgp1`.
- Space settings → **File Listing: Restricted**.
- *(Recommended)* enable the **CDN**, and add a **Lifecycle rule** to expire
  `varify-product-options/backups/` after 30 days.

#### 1.3 Create the Droplet
1. DO → **Create → Droplet** → Region **Singapore (SGP1)**.
2. Image **Ubuntu 24.04 LTS**.
3. Size **Basic → Regular → $6/mo (1 GB)** (or $4/512 MB with the swap step below).
4. Add your **SSH key**, create, copy the **public IP**.

#### 1.4 Point the domain
DNS for `pistalix.in` → add **A record**: host `apppov` → `<droplet IP>`, TTL 300.
Verify: `nslookup apppov.pistalix.in` returns the droplet IP. (Required before HTTPS works.)

#### 1.5 Prepare the server (`ssh root@<IP>`)
```bash
# Swap — prevents build OOM on small droplets
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Docker + Compose + git
apt-get update && apt-get install -y docker.io docker-compose-v2 git
systemctl enable --now docker

# Firewall
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

#### 1.6 Clone & configure
```bash
git clone <your-repo-url> /opt/pistalix
cd /opt/pistalix
cp .env.example .env
nano .env     # fill in all values (see ".env reference" below)
```

#### 1.7 Launch
```bash
docker compose up -d --build      # first build takes a few minutes
docker compose logs -f app        # watch for migrate + server start
```
Open **https://apppov.pistalix.in** — Caddy issues the TLS cert on first request.

#### 1.8 Backups
```bash
# Test once
docker compose exec -T app node scripts/backup-db.mjs
# Schedule daily (crontab -e):
0 3 * * * cd /opt/pistalix && docker compose exec -T app node scripts/backup-db.mjs >> /var/log/pistalix-backup.log 2>&1
```

#### `.env` reference
```
SHOPIFY_API_KEY=07a0a225a28e52758463e6995952b30b
SHOPIFY_API_SECRET=<Partner Dashboard → API credentials → Client secret>
SHOPIFY_APP_URL=https://apppov.pistalix.in
SCOPES=read_cart_transforms,read_draft_orders,read_files,write_cart_transforms,write_draft_orders,write_files,write_metaobject_definitions,write_metaobjects,write_products
SHOPIFY_CART_PRICE_OVERRIDE_ID=<fill after `npm run deploy`, see Guide 2>
DATABASE_URL=file:./dev.sqlite          # overridden to file:/data/prod.sqlite inside Docker
SPACES_KEY=<your spaces key>
SPACES_SECRET=<your spaces secret>
SPACES_REGION=sgp1
SPACES_ENDPOINT=https://sgp1.digitaloceanspaces.com
SPACES_BUCKET=king-vid
SPACES_CDN_URL=https://king-vid.sgp1.digitaloceanspaces.com
SPACES_FOLDER=varify-product-options
```

### Guide 2 — Shopify (deploy config & publish)

#### 2.1 Deploy app config, Functions & extensions (from your machine)
```bash
npm install
npm run deploy        # = shopify app deploy --allow-updates
```
> `--allow-updates` is baked into the script so deploys work from non-interactive shells
> (e.g. Git Bash / CI) without prompting. It adds/updates config & extensions but never deletes.

This pushes `shopify.app.toml` (URLs + GDPR compliance webhooks), the cart-price-override
**Function**, and the **theme app extension**.

#### 2.2 Get the Function ID
After deploy, find the `cart-price-override` Function ID (Partner Dashboard → app →
Extensions, or via GraphiQL):
```graphql
query { shopifyFunctions(first: 25) { nodes { id title apiType } } }
```
Copy the `id` of the `cart_transform` function into `.env` on the droplet as
`SHOPIFY_CART_PRICE_OVERRIDE_ID`, then `docker compose up -d`.

#### 2.3 Verify config (Partner Dashboard → Configuration)
- App URL: `https://apppov.pistalix.in`
- Redirect URL: `https://apppov.pistalix.in/auth/callback`
- App proxy: subpath `product-options`, prefix `apps`
- Compliance webhooks: `https://apppov.pistalix.in/webhooks/compliance`

#### 2.4 Install & smoke-test on a development store
1. Partners → **Test your app** → install on a dev store.
2. Confirm OAuth completes and the app loads embedded.
3. Upload an image in an option set → confirm it lands under
   `king-vid/varify-product-options/<shop>/` and renders.
4. Confirm the storefront widget + cart price override work.

#### 2.5 Rotate the Spaces key (security)
DO → API → Spaces Keys → generate new → update `.env` → `docker compose up -d` → delete old key.

#### 2.6 Submit to the Shopify App Store
Partners → **Distribution → Shopify App Store → Create listing**. Required: icon, screenshots,
description, pricing, privacy policy URL, working OAuth, compliance webhooks (implemented),
embedded session-token auth (configured). Then **Submit for review**.

### Day-2 operations
```bash
cd /opt/pistalix && git pull && docker compose up -d --build   # deploy new code
docker compose logs -f app                                     # logs
docker compose exec -T app node scripts/backup-db.mjs          # manual backup
```
