import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { membersRepository } from "../../repositories/members/membersRepository";

export const membersQueryKey = (tripId: string) =>
  ["members", tripId] as const;

export function useMembers(tripId: string) {
  return useQuery({
    queryKey: membersQueryKey(tripId),
    queryFn: () => membersRepository.list(tripId),
  });
}

export function useRemoveMember(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => membersRepository.remove(tripId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersQueryKey(tripId) });
    },
  });
}
