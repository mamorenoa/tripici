import { useMutation, useQueryClient } from "@tanstack/react-query";

import { expensesRepository } from "../../repositories/expenses/expensesRepository";
import type { ExpenseCreate } from "./types";
import { expensesQueryKey } from "./useExpenses";

export function useCreateExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseCreate) =>
      expensesRepository.create(tripId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expensesQueryKey(tripId) });
    },
  });
}
