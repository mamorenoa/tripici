import { useMutation, useQueryClient } from "@tanstack/react-query";

import { expensesRepository } from "../../repositories/expenses/expensesRepository";
import { expensesQueryKey } from "./useExpenses";

export function useDeleteExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) =>
      expensesRepository.delete(tripId, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expensesQueryKey(tripId) });
    },
  });
}
