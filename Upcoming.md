# Add Theme App Extension for App Embed and App Block

This plan outlines the steps to create a Shopify Theme App Extension for Varify Product Options Variant. This will allow merchants to embed your app into their storefronts and add custom product options via an App Block on their product pages.

Specifically, it will implement the functionality to directly display the templates/option sets built in the admin app onto the theme storefront, leveraging the data stored in Shopify metafields.

## User Review Required

> [!IMPORTANT]
> Since the Shopify CLI requires an interactive terminal for some prompts (like selecting the extension type and naming it), I will run the equivalent non-interactive command if available, or I will need to structure the commands to bypass prompts.
> Are you comfortable with me generating the extension named `theme-extension` automatically?

## Open Questions

> [!WARNING]
> Do you have any specific design or functionality requirements for the initial App Block (e.g., injecting a specific React/Vanilla JS script, fetching data from your app's backend) that you want included in the first version? 

## Proposed Changes

### Generate Theme App Extension

We will use the Shopify CLI to generate a theme app extension in the `extensions/` directory.

#### [NEW] `extensions/theme-extension/shopify.extension.toml`
Configuration file for the theme app extension.

#### [NEW] `extensions/theme-extension/blocks/app-embed.liquid`
The App Embed block that will be toggled on in the theme settings (e.g., "Varify Product Options Variant Core"). It will include global styles and scripts to handle dynamic price updates and cart logic.

#### [NEW] `extensions/theme-extension/blocks/product-options.liquid`
The App Block that merchants will drag-and-drop onto their Product Pages to display the custom fields. This file will:
1. Fetch the product's assigned option set data directly from `product.metafields.custom.product_options.value` (as synced by your app).
2. Render the custom input elements (text, dropdowns, swatches, file uploads) dynamically based on the JSON configuration built from your app's templates.
3. Automatically append the collected custom options to the line item properties when added to the cart.

#### [NEW] `extensions/theme-extension/assets/pistalix-options.js`
The core JavaScript file that handles:
- Validating required custom fields.
- Updating the displayed product price if an option includes add-on costs.
- Injecting the option data into the standard Shopify "Add to Cart" form submission.

#### [NEW] `extensions/theme-extension/assets/pistalix-options.css`
The stylesheet for rendering the custom options beautifully on the storefront, matching modern aesthetics.

## Verification Plan

### Automated Tests
- N/A for theme extensions initially, but I will ensure the liquid syntax is correct.

### Manual Verification
- Run `npm run dev`.
- Ensure the dev server properly builds and deploys the theme extension to your development store.
- Open the Theme Editor in your Shopify Admin, verify the App Embed can be enabled and the App Block can be added to the product page.
