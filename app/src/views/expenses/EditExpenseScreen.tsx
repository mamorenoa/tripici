import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import type { ExpenseCreate } from "../../domain/expenses/types";
import { useDeleteExpense } from "../../domain/expenses/useDeleteExpense";
import { useExpenses } from "../../domain/expenses/useExpenses";
import { useUpdateExpense } from "../../domain/expenses/useUpdateExpense";
import { ExpenseForm } from "./ExpenseForm";

export function EditExpenseScreen() {
  const { id: tripId, expenseId } = useLocalSearchParams<{
    id: string;
    expenseId: string;
  }>();
  const router = useRouter();
  const { data: expenses, isLoading } = useExpenses(tripId);
  const updateMutation = useUpdateExpense(tripId);
  const deleteMutation = useDeleteExpense(tripId);

  const expense = expenses?.find((e) => e.id === expenseId);

  if (isLoading || !expense) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  async function handleSave(input: ExpenseCreate) {
    try {
      await updateMutation.mutateAsync({ id: expenseId, patch: input });
      router.back();
    } catch {
      // Surfaced inside ExpenseForm via the `error` prop.
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(expenseId);
      router.back();
    } catch {
      // Best-effort.
    }
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        <ExpenseForm
          initialValue={expense}
          submitting={updateMutation.isPending}
          error={updateMutation.error ?? undefined}
          onSubmit={handleSave}
        />
      </View>
      <View className="px-4 py-3 border-t border-border bg-surface">
        <Button
          variant="danger"
          onPress={handleDelete}
          isLoading={deleteMutation.isPending}
        >
          <Icon name="trash-2" size={18} color="#e11d48" />
        </Button>
      </View>
    </View>
  );
}
