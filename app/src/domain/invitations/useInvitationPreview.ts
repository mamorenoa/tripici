import { useQuery } from "@tanstack/react-query";

import { invitationsRepository } from "../../repositories/invitations/invitationsRepository";

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: ["invitation-preview", token] as const,
    queryFn: () => invitationsRepository.preview(token),
    // Invalid tokens return 404; retrying won't help and just adds latency.
    retry: false,
  });
}
