import type { TripMember } from "../../domain/members/types";
import { apiRequest } from "../../lib/apiClient";

export const membersRepository = {
  list: (tripId: string): Promise<TripMember[]> =>
    apiRequest<TripMember[]>(`/trips/${tripId}/members`),
  remove: (tripId: string, userId: string): Promise<void> =>
    apiRequest<void>(`/trips/${tripId}/members/${userId}`, { method: "DELETE" }),
};
