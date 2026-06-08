import { useLocalSearchParams, useRouter } from "expo-router";

import type { ExpenseCreate } from "../../domain/expenses/types";
import { useCreateExpense } from "../../domain/expenses/useCreateExpense";
import { ExpenseForm } from "./ExpenseForm";

export function AddExpenseScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mutation = useCreateExpense(tripId);

  async function handleSubmit(input: ExpenseCreate) {
    try {
      await mutation.mutateAsync(input);
      router.back();
    } catch {
      // Error rendered inside the form via ``mutation.error``.
    }
  }

  return (
    <ExpenseForm
      submitting={mutation.isPending}
      error={mutation.error ?? undefined}
      onSubmit={handleSubmit}
    />
  );
}
