import { QueryClient } from "@tanstack/react-query";
import { setupPassbookCache } from "./passbookCache";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403 || status === 404) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

// Initialize automatic offline passbook synchronization
if (typeof window !== "undefined") {
  setupPassbookCache(queryClient);
}

