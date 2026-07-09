import type { components } from "../../repositories/_generated/api";

// Reads embed the documentation links, so the app's `Plan` is `PlanRead`.
export type Plan = components["schemas"]["PlanRead"];
export type PlanCreate = components["schemas"]["PlanCreate"];
export type PlanUpdate = components["schemas"]["PlanUpdate"];
export type PlanLink = components["schemas"]["PlanLink"];
export type PlanLinkCreate = components["schemas"]["PlanLinkCreate"];
