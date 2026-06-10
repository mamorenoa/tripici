import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invitationsRepository } from "../../repositories/invitations/invitationsRepository";

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => invitationsRepository.accept(token),
    onSuccess: () => {
      // Force the trips list to refetch — the newly-joined trip appears
      // there (the backend includes shared trips in /trips).
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}
