import type {
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
} from "../../domain/expenses/types";
import { apiRequest } from "../../lib/apiClient";

export const expensesRepository = {
  list: (tripId: string): Promise<Expense[]> =>
    apiRequest<Expense[]>(`/trips/${tripId}/expenses`),

  create: (tripId: string, input: ExpenseCreate): Promise<Expense> =>
    apiRequest<Expense>(`/trips/${tripId}/expenses`, {
      method: "POST",
      body: input,
    }),

  update: (
    tripId: string,
    expenseId: string,
    patch: ExpenseUpdate,
  ): Promise<Expense> =>
    apiRequest<Expense>(`/trips/${tripId}/expenses/${expenseId}`, {
      method: "PATCH",
      body: patch,
    }),

  delete: (tripId: string, expenseId: string): Promise<void> =>
    apiRequest<void>(`/trips/${tripId}/expenses/${expenseId}`, {
      method: "DELETE",
    }),
};
