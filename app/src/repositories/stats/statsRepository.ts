import type { TripStats } from "../../domain/stats/types";
import { apiRequest } from "../../lib/apiClient";

export const statsRepository = {
  get: (tripId: string): Promise<TripStats> =>
    apiRequest<TripStats>(`/trips/${tripId}/stats`),
};
