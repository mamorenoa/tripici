import type { Trip, TripCreate, TripUpdate } from "../../domain/trips/types";
import { apiRequest } from "../../lib/apiClient";

/**
 * Concrete trips repository — speaks HTTP to the backend. Domain hooks
 * (`useTrips`, `useCreateTrip`, `useUpdateTrip`) only know this surface;
 * they never see the URL, the method, or the JSON shape.
 */
export const tripsRepository = {
  list: (): Promise<Trip[]> => apiRequest<Trip[]>("/trips"),

  get: (tripId: string): Promise<Trip> =>
    apiRequest<Trip>(`/trips/${tripId}`),

  create: (input: TripCreate): Promise<Trip> =>
    apiRequest<Trip>("/trips", { method: "POST", body: input }),

  update: (tripId: string, patch: TripUpdate): Promise<Trip> =>
    apiRequest<Trip>(`/trips/${tripId}`, { method: "PATCH", body: patch }),

  // Owner-only on the backend; 204 with no body.
  remove: (tripId: string): Promise<void> =>
    apiRequest<void>(`/trips/${tripId}`, { method: "DELETE" }),
};
