import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

  // Re-uses the list cache. If the user deep-linked here without ever
  // visiting the detail screen, the list is fetched on mount.
  const expense = expenses?.find((e) => e.id === expenseId);

  if (isLoading || !expense) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  async function handleSave(input: ExpenseCreate) {
    try {
      await updateMutation.mutateAsync({ id: expenseId, patch: input });
      router.back();
    } catch {
      // Error surfaced via the form's ``error`` prop.
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(expenseId);
      router.back();
    } catch {
      // Best-effort. Caller may try again.
    }
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <ExpenseForm
          initialValue={expense}
          submitting={updateMutation.isPending}
          error={updateMutation.error ?? undefined}
          onSubmit={handleSave}
        />
      </View>
      <Pressable
        onPress={handleDelete}
        disabled={deleteMutation.isPending}
        style={styles.deleteButton}
      >
        {deleteMutation.isPending ? (
          <ActivityIndicator color="#b00020" />
        ) : (
          <Text style={styles.deleteText}>Delete expense</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  deleteButton: {
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
  },
  deleteText: { color: "#b00020", fontWeight: "600" },
});
