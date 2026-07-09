import type {
  SettlementPaymentCreate,
  TripSettlement,
} from "../../domain/settlements/types";
import { apiRequest } from "../../lib/apiClient";

export const settlementsRepository = {
  get: (tripId: string): Promise<TripSettlement> =>
    apiRequest<TripSettlement>(`/trips/${tripId}/settlement`),

  recordPayment: (
    tripId: string,
    body: SettlementPaymentCreate,
  ): Promise<unknown> =>
    apiRequest(`/trips/${tripId}/settlement/payments`, {
      method: "POST",
      body,
    }),

  deletePayment: (tripId: string, paymentId: string): Promise<unknown> =>
    apiRequest(`/trips/${tripId}/settlement/payments/${paymentId}`, {
      method: "DELETE",
    }),
};
