import type { components } from "../../repositories/_generated/api";
import { apiRequest } from "../../lib/apiClient";

type Invitation = components["schemas"]["InvitationRead"];
type InvitationPreview = components["schemas"]["InvitationPreview"];
type Trip = components["schemas"]["Trip"];

export const invitationsRepository = {
  list: (tripId: string): Promise<Invitation[]> =>
    apiRequest<Invitation[]>(`/trips/${tripId}/invitations`),

  create: (tripId: string): Promise<Invitation> =>
    apiRequest<Invitation>(`/trips/${tripId}/invitations`, {
      method: "POST",
    }),

  revoke: (tripId: string, invitationId: string): Promise<void> =>
    apiRequest<void>(
      `/trips/${tripId}/invitations/${invitationId}`,
      { method: "DELETE" },
    ),

  preview: (token: string): Promise<InvitationPreview> =>
    apiRequest<InvitationPreview>(`/invitations/preview/${token}`),

  accept: (token: string): Promise<Trip> =>
    apiRequest<Trip>("/invitations/accept", {
      method: "POST",
      body: { token },
    }),
};
