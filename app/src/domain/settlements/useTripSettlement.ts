import { useQuery } from "@tanstack/react-query";

import { settlementsRepository } from "../../repositories/settlements/settlementsRepository";

export const settlementQueryKey = (tripId: string) =>
  ["settlement", tripId] as const;

export function useTripSettlement(tripId: string) {
  return useQuery({
    queryKey: settlementQueryKey(tripId),
    queryFn: () => settlementsRepository.get(tripId),
  });
}
