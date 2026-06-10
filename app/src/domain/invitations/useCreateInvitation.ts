import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invitationsRepository } from "../../repositories/invitations/invitationsRepository";
import { invitationsQueryKey } from "./useInvitations";

export function useCreateInvitation(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invitationsRepository.create(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: invitationsQueryKey(tripId),
      });
    },
  });
}
