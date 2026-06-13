# Pistalix Product Variant - Shopify App Documentation

## Non-Technical Info

### Project Overview
Pistalix Product Variant is a powerful Shopify application designed to help merchants bypass Shopify's default variant limits (typically 100 variants and 3 options per product). It allows store owners to create unlimited custom product options—such as text inputs, file uploads, color swatches, dropdowns, and checkboxes—and apply them to products across their storefront. By empowering merchants to offer highly customizable products, the app solves the problem of restrictive product configuration out-of-the-box, leading to enhanced shopping experiences and increased conversion rates.

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
4. Find **Pistalix Product Variant Core** (or similar) in the list and toggle the switch to **ON**.
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
