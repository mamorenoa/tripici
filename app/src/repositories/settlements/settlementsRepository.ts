import type { TripSettlement } from "../../domain/settlements/types";
import { apiRequest } from "../../lib/apiClient";

export const settlementsRepository = {
  get: (tripId: string): Promise<TripSettlement> =>
    apiRequest<TripSettlement>(`/trips/${tripId}/settlement`),
};
