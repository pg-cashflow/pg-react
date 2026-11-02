import React from "react";
import { renderToString } from "react-dom/server";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { LocaleProvider } from "@/i18n";
import { LandingPage } from "@/routes/landing";
import { TermsPage } from "@/routes/terms";
import { PrivacyPage } from "@/routes/privacy";
import { RefundPolicyPage } from "@/routes/refund-policy";
import { ContactPage } from "@/routes/contact";

async function renderWithRouter(Component: React.ComponentType): Promise<string> {
  const rootRoute = createRootRoute();
  const testRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <Component />,
  });
  const routeTree = rootRoute.addChildren([testRoute]);
  const history = createMemoryHistory({ initialEntries: ["/"] });
  const router = createRouter({ routeTree, history });
  await router.load();

  return renderToString(
    <LocaleProvider>
      <RouterProvider router={router} />
    </LocaleProvider>
  );
}

export async function prerenderAll() {
  return {
    landing: await renderWithRouter(LandingPage),
    terms: await renderWithRouter(TermsPage),
    privacy: await renderWithRouter(PrivacyPage),
    refundPolicy: await renderWithRouter(RefundPolicyPage),
    contact: await renderWithRouter(ContactPage),
  };
}
