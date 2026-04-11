export type CategoryMemory = {
  /** Normalized phone (e.g. 252617703215) */
  phone: string;
  name?: string;
  /** Display category name (matches expense category labels) */
  category: string;
  updated_at: string;
};
