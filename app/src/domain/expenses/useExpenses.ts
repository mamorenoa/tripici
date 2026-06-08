import { useQuery } from "@tanstack/react-query";

import { expensesRepository } from "../../repositories/expenses/expensesRepository";

export const expensesQueryKey = (tripId: string) =>
  ["expenses", tripId] as const;

export function useExpenses(tripId: string) {
  return useQuery({
    queryKey: expensesQueryKey(tripId),
    queryFn: () => expensesRepository.list(tripId),
  });
}
