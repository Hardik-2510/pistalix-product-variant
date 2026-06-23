# Shopify App Store Listing Requirements

This document serves as a template to fill out the 19 required fields for the Shopify App Store listing submission.

## 1. Basic app information

*   **App name (≤30 chars):** PistaLix Product Variant
*   **App category:** Store design > Product displays / Options
*   **Languages your app/UI supports:** English

## 2. App store listing content

*   **App introduction (100 chars max):** Create unlimited custom product options, variants, and dynamic templates to boost sales instantly.
*   **App details (500 chars max):** Varify Product Options Variant allows you to break free from Shopify's 100-variant limit. Easily build custom product option sets, add text fields, swatches, file uploads, and advanced conditional logic. Design dynamic templates that seamlessly integrate with your product pages, ensuring a smooth and personalized shopping experience for your customers without complex coding.
*   **Features (up to 6, 80 chars each):**
    1.  Unlimited custom product options and variants to bypass Shopify limits.
    2.  Dynamic option sets including swatches, text fields, and file uploads.
    3.  Advanced conditional logic to show/hide options based on user selections.
    4.  Seamlessly assign custom templates to specific products or entire collections.
    5.  Premium UI customization including custom fonts, typography, and dynamic colors.
*   **Feature media:** *(Requires header image/video uploaded in dashboard)*
*   **Screenshots:** *(Minimum 3 distinct 1600x900px screenshots showing actual app UI)*
*   **Support:** support@pistalix.com
*   **Resources:** *(Link to documentation or help center)*

## 3. Pricing details

*   **Basic Plan:** Free. Includes up to 3 Option Sets & Templates, General Color controls.
*   **Standard Plan:** $4.99/mo. Includes up to 5 Option Sets & Templates, Advanced Features, Advanced Colors.
*   **Premium Plan:** $9.99/mo. Unlimited Option Sets, Advanced Settings, Custom Fonts, Typography controls.

## 4. App discovery content

*   **App card subtitle (~64 chars):** Unlimited custom product options & variants for your store.
*   **App store search terms:** product options, infinite variants, custom product fields, swatches, product variants

## 5. Install requirements

*   **Sales Channel requirements:** Requires Online Store to be active.

## 6. Contact information

*   **Merchant review email:** reviews@pistalix.com
*   **App submission email:** dev@pistalix.com

## 7. App testing information

*   **Test account:** *(e.g., https://pistalix-test-store.myshopify.com, Password: 1234)*
*   **Screencast URL:** *(Link to unlisted YouTube or Loom video showing end-to-end setup)*
*   **Testing instructions:** 
    1. Install the app on the test store.
    2. Navigate to "Templates" and create a new template.
    3. Add a Color Swatch option and a Text Field option.
    4. Apply the template to the sample "T-Shirt" product.
    5. Visit the storefront product page to verify the custom options render and can be added to the cart successfully.

## Important Note Regarding Pricing Configuration

Based on the Partner Dashboard limitations, you cannot configure a "Monthly recurring" charge with a value of $0. For your **Basic (Free)** plan:
1. **Do not create a $0 recurring charge** in the Partner Dashboard.
2. In your app code, when a merchant selects the Basic (Free) tier, simply **bypass the billing API subscription creation** completely. Your app should recognize them as being on the free tier by default without requiring an active $0 subscription ID.
