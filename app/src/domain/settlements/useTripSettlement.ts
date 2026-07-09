import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { settlementsRepository } from "../../repositories/settlements/settlementsRepository";
import type { SettlementPaymentCreate } from "./types";

export const settlementQueryKey = (tripId: string) =>
  ["settlement", tripId] as const;

export function useTripSettlement(tripId: string) {
  return useQuery({
    queryKey: settlementQueryKey(tripId),
    queryFn: () => settlementsRepository.get(tripId),
  });
}

export function useRecordPayment(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SettlementPaymentCreate) =>
      settlementsRepository.recordPayment(tripId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settlementQueryKey(tripId) });
    },
  });
}

export function useDeletePayment(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      settlementsRepository.deletePayment(tripId, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settlementQueryKey(tripId) });
    },
  });
}
