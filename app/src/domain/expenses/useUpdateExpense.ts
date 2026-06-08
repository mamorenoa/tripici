import { useMutation, useQueryClient } from "@tanstack/react-query";

import { expensesRepository } from "../../repositories/expenses/expensesRepository";
import type { ExpenseUpdate } from "./types";
import { expensesQueryKey } from "./useExpenses";

export function useUpdateExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ExpenseUpdate }) =>
      expensesRepository.update(tripId, id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expensesQueryKey(tripId) });
    },
  });
}
