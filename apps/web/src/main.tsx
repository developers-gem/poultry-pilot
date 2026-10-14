import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ApiError } from "./api/client";
import { AuthProvider } from "./api/auth";
import { toast } from "./components/toast";
import { errorText } from "./components/states";
import { router } from "./router";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    // Offline: keep showing what was loaded; refetch when the connection returns.
    queries: { staleTime: 30_000, refetchOnWindowFocus: true, networkMode: "offlineFirst", retry: (n, e) => n < 2 && !(e instanceof ApiError && e.status >= 400 && e.status < 500) },
    // Failed writes are reported here unless a form already shows the error inline (forms mark it; checked a tick later).
    mutations: { onError: (e) => { setTimeout(() => { if (!(e as { shownInline?: boolean }).shownInline) toast.error(errorText(e)); }, 0); } },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
