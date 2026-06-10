import { useQuery } from "@tanstack/react-query";

import { membersRepository } from "../../repositories/members/membersRepository";

export const membersQueryKey = (tripId: string) =>
  ["members", tripId] as const;

export function useMembers(tripId: string) {
  return useQuery({
    queryKey: membersQueryKey(tripId),
    queryFn: () => membersRepository.list(tripId),
  });
}
