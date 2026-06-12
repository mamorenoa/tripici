export type CategoryStat = {
  category_code: string;
  label: string;
  total_cents: number;
  pct: number;
};

export type MemberStat = {
  user_id: string;
  display_name: string;
  total_cents: number;
  pct: number;
};

export type DateStat = {
  date: string; // "YYYY-MM-DD"
  total_cents: number;
};

export type TripStats = {
  total_cents: number;
  by_category: CategoryStat[];
  by_member: MemberStat[];
  by_date: DateStat[];
};
