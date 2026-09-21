import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import { AuthProvider } from "./auth/context";
import { ThemeProvider } from "./theme/context";
import { queryClient } from "./lib/queryClient";
import { router } from "./router";
import { LocaleProvider, LocaleSync } from "./i18n";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ThemeProvider>
          <AuthProvider>
            <LocaleSync />
            <RouterProvider router={router} />
          </AuthProvider>
        </ThemeProvider>
      </LocaleProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
