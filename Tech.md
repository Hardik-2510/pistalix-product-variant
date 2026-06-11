# PistaLix Globo - Technical Documentation

This document outlines the architecture, tech stack, and core technical flows of the PistaLix Globo Shopify application, superseding the default generic template documentation.

## 1. Tech Stack
- **Framework:** React Router v7 (Full-stack routing, loaders, and server actions)
- **Frontend UI:** Shopify Polaris (React components), `@dnd-kit` (Drag-and-drop reordering)
- **Database / ORM:** Prisma Client, utilizing SQLite (development) and PostgreSQL/MySQL (production)
- **Session Management:** `@shopify/shopify-app-session-storage-prisma`

## 2. Core Architecture

### Data Models
The core domain model revolves around "Option Sets":
- **OptionSet:** The parent configuration (e.g., "Custom Engraving Template").
- **Section:** A logical grouping of elements within an OptionSet. Sections support custom styling (padding, background colors, text colors) and visibility toggling.
- **Element:** An individual input field (e.g., Text, File Upload, Color Swatch, Image Swatch). Elements store their specific behavior settings in a JSON `config` column to maintain schema flexibility.
- **ProductRule:** Determines the targeting of an OptionSet, specifically whether it applies globally (`ALL_PRODUCTS`) or to specific products (`SPECIFIC_PRODUCTS`).

### Admin Template Builder (`app/routes/app.templates.$id.jsx`)
The template builder is a deeply interactive React application that allows merchants to:
- Add, edit, duplicate, and reorder Sections and Elements.
- Edit section-level styling via a modal.
- Preview option sets in real-time alongside the editor.
- The state is managed locally in React, and when the user clicks "Save", a bulk `useFetcher` `POST` request sends the serialized `elements` and `sections` to the route's server action.
- The server action reconstructs the OptionSet by clearing old sections/elements and inserting the updated hierarchy, preventing orphaned data.

## 3. Storefront Delivery Strategy: Metafields Sync

To ensure maximum performance and zero-latency rendering on the storefront, PistaLix Globo does **not** rely on App Proxies or direct API calls to fetch options on the product page. Instead, it uses a highly efficient **Metafield Sync Architecture**.

When a merchant saves an Option Set in the Admin dashboard, the `syncOptionSetToMetafields` logic (`app/lib/metafields.server.js`) automatically triggers:

1. **Payload Generation:** The app serializes the entire Option Set (Sections, Elements, Styles, and configuration) into a structured JSON payload.
2. **Targeting & GraphQL Mutation:** Using the Shopify Admin GraphQL API, the app writes this JSON payload into Shopify Metafields (`metafieldsSet` mutation).
3. **Granular Storage:**
   - **Global Rules (`ALL_PRODUCTS`):** The payload is saved to a `Shop`-level global metafield (namespace: `custom`, key: `po_global_[shortId]`).
   - **Specific Products (`SPECIFIC_PRODUCTS`):** The payload is written directly to the targeted Product's metafields (namespace: `custom`, key: `product_options`).

**Benefits of this approach:**
- **Ultra-Fast Performance:** App Blocks injected into the storefront theme can read metafields directly via Liquid or the Storefront API. Zero external network requests to the app's server are required to render the options.
- **High Reliability:** If the app's backend server experiences downtime or high traffic, the merchant's storefront continues to function perfectly because the option data is stored natively within Shopify's infrastructure.

## 4. Development Workflow
- **Start Local Server:** `npm run dev` (starts the development server and tunnel).
- **Database Schema Updates:** Run `npx prisma db push` or `npm run setup` when modifying `schema.prisma`.
- **GraphQL:** The app leverages Shopify's GraphQL code generation for strictly typed Admin API interactions.
