// Re-export auth-related types from the generated client so the rest
// of the code never reaches into `_generated` directly.
import type { components } from "../../repositories/_generated/api";

export type User = components["schemas"]["UserRead"];
export type UserCreate = components["schemas"]["UserCreate"];
