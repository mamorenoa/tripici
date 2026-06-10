import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invitationsRepository } from "../../repositories/invitations/invitationsRepository";
import { invitationsQueryKey } from "./useInvitations";

export function useRevokeInvitation(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      invitationsRepository.revoke(tripId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: invitationsQueryKey(tripId),
      });
    },
  });
}
