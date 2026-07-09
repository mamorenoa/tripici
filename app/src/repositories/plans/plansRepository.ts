import type {
  Plan,
  PlanCreate,
  PlanLink,
  PlanLinkCreate,
  PlanUpdate,
} from "../../domain/plans/types";
import { apiRequest } from "../../lib/apiClient";

export const plansRepository = {
  list: (tripId: string): Promise<Plan[]> =>
    apiRequest<Plan[]>(`/trips/${tripId}/plans`),

  create: (tripId: string, input: PlanCreate): Promise<Plan> =>
    apiRequest<Plan>(`/trips/${tripId}/plans`, {
      method: "POST",
      body: input,
    }),

  update: (tripId: string, planId: string, patch: PlanUpdate): Promise<Plan> =>
    apiRequest<Plan>(`/trips/${tripId}/plans/${planId}`, {
      method: "PATCH",
      body: patch,
    }),

  delete: (tripId: string, planId: string): Promise<void> =>
    apiRequest<void>(`/trips/${tripId}/plans/${planId}`, {
      method: "DELETE",
    }),

  addLink: (
    tripId: string,
    planId: string,
    body: PlanLinkCreate,
  ): Promise<PlanLink> =>
    apiRequest<PlanLink>(`/trips/${tripId}/plans/${planId}/links`, {
      method: "POST",
      body,
    }),

  deleteLink: (
    tripId: string,
    planId: string,
    linkId: string,
  ): Promise<void> =>
    apiRequest<void>(`/trips/${tripId}/plans/${planId}/links/${linkId}`, {
      method: "DELETE",
    }),
};
