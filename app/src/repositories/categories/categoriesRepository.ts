import type { Category } from "../../domain/categories/types";
import { apiRequest } from "../../lib/apiClient";

export const categoriesRepository = {
  list: (): Promise<Category[]> => apiRequest<Category[]>("/categories"),
};
