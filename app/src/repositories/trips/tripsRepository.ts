import type { Trip, TripCreate } from "../../domain/trips/types";
import { apiRequest } from "../../lib/apiClient";

/**
 * Concrete trips repository — speaks HTTP to the backend. Domain hooks
 * (`useTrips`, `useCreateTrip`) only know this surface; they never see
 * the URL, the method, or the JSON shape.
 */
export const tripsRepository = {
  list: (): Promise<Trip[]> => apiRequest<Trip[]>("/trips"),

  create: (input: TripCreate): Promise<Trip> =>
    apiRequest<Trip>("/trips", { method: "POST", body: input }),
};
