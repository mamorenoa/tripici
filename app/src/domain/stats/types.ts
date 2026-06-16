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

export type TripStat = {
  trip_id: string;
  trip_name: string;
  total_cents: number;
};

export type MonthStat = {
  month: string; // "YYYY-MM"
  total_cents: number;
};

export type GlobalStats = {
  total_cents: number;
  by_category: CategoryStat[]; // always unfiltered — drives the filter pills
  by_trip: TripStat[];         // filtered when category_code is provided
  by_month: MonthStat[];       // filtered when category_code is provided
};
