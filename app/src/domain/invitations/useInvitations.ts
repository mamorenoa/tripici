import { useQuery } from "@tanstack/react-query";

import { invitationsRepository } from "../../repositories/invitations/invitationsRepository";

export const invitationsQueryKey = (tripId: string) =>
  ["invitations", tripId] as const;

// ``enabled`` lets the caller skip the request entirely when the user
// is not the owner — non-owners get a 404 from the backend.
export function useInvitations(tripId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: invitationsQueryKey(tripId),
    queryFn: () => invitationsRepository.list(tripId),
    enabled,
    retry: false,
  });
}
