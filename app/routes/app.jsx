import { Outlet, useLoaderData, useRouteError, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import english from "@shopify/polaris/locales/en.json";

export const i18n = {
  en: english,
};

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

import { AppProvider as PolarisAppProvider } from "@shopify/polaris";

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey} i18n={english}>
      <PolarisAppProvider i18n={english}>
        <ui-nav-menu>
          <Link to="/app">Home</Link>
          <Link to="/app/option-sets">Option Sets</Link>
          <Link to="/app/templates">Templates</Link>
          <Link to="/app/settings">Settings</Link>
          <Link to="/app/contact-us">Contact Us</Link>
        </ui-nav-menu>
        <Outlet />
      </PolarisAppProvider>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
