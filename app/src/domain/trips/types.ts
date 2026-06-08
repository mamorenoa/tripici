// Re-export the API types from the generated client so the rest of the
// code never reaches into `_generated` directly. When a property name or
// shape changes, only this file (and the generator) need updating.
import type { components } from "../../repositories/_generated/api";

export type Trip = components["schemas"]["Trip"];
export type TripCreate = components["schemas"]["TripCreate"];
