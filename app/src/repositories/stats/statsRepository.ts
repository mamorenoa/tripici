import type { GlobalStats, TripStats } from "../../domain/stats/types";
import { apiRequest } from "../../lib/apiClient";

export const statsRepository = {
  get: (tripId: string): Promise<TripStats> =>
    apiRequest<TripStats>(`/trips/${tripId}/stats`),

  getGlobal: (categoryCode?: string): Promise<GlobalStats> => {
    const qs = categoryCode ? `?category_code=${categoryCode}` : "";
    return apiRequest<GlobalStats>(`/stats${qs}`);
  },
};
