import { QueryClient } from "@tanstack/react-query";

// Shared QueryClient instance. Provided at the app root in
// `app/_layout.tsx` and consumed by every hook via `useQuery` /
// `useMutation`.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Keep results fresh for 30s before refetching on focus / mount.
      staleTime: 30_000,
    },
  },
});
