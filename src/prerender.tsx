import React from "react";
import { renderToString } from "react-dom/server";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { LocaleProvider } from "@/i18n";
import { LandingPage } from "@/routes/landing";
import { TermsPage } from "@/routes/terms";
import { PrivacyPage } from "@/routes/privacy";
import { RefundPolicyPage } from "@/routes/refund-policy";
import { ContactPage } from "@/routes/contact";

async function renderWithRouter(Component: React.ComponentType, path: string): Promise<string> {
  const rootRoute = createRootRoute();
  const testRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: Component,
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
    landing: await renderWithRouter(LandingPage, "/"),
    terms: await renderWithRouter(TermsPage, "/terms"),
    privacy: await renderWithRouter(PrivacyPage, "/privacy"),
    refundPolicy: await renderWithRouter(RefundPolicyPage, "/refund-policy"),
    contact: await renderWithRouter(ContactPage, "/contact"),
  };
}
