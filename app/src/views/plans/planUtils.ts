import type { Plan } from "../../domain/plans/types";

export type PlanSort = "soonest" | "latest";

// A categorical palette. Each plan gets a stable colour derived from its
// id (no storage, no migration) — same plan → same colour everywhere.
const PLAN_COLORS = [
  "#059669", // emerald
  "#2563eb", // blue
  "#db2777", // pink
  "#d97706", // amber
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#dc2626", // red
  "#65a30d", // lime
  "#ea580c", // orange
  "#4f46e5", // indigo
];

export function planColor(plan: Plan): string {
  const id = plan.id ?? "";
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PLAN_COLORS[h % PLAN_COLORS.length];
}

/** Local date as "YYYY-MM-DD". */
export function isoOf(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function todayIso(): string {
  return isoOf(new Date());
}

/** A plan is "past" when its end (or start, if no end) date is before
 * today. Undated plans are never past. */
export function planIsPast(plan: Plan, today: string): boolean {
  const ref = plan.end_date || plan.start_date;
  return !!ref && ref < today;
}

/** The inclusive end of a plan's date range (falls back to start). */
function planEnd(plan: Plan): string | null {
  if (!plan.start_date) return null;
  return plan.end_date && plan.end_date >= plan.start_date
    ? plan.end_date
    : plan.start_date;
}

/** Whether a plan occurs on a given day (full start..end range). */
export function planOccursOn(plan: Plan, dayIso: string): boolean {
  const end = planEnd(plan);
  return !!plan.start_date && dayIso >= plan.start_date && dayIso <= end!;
}

/** Compact meta line: dates + time, duration, link count. */
export function planMeta(plan: Plan): string {
  const parts: string[] = [];
  const time = plan.start_time ? plan.start_time.slice(0, 5) : "";
  const start = plan.start_date
    ? `${plan.start_date}${time ? ` ${time}` : ""}`
    : "";
  if (plan.start_date && plan.end_date && plan.start_date !== plan.end_date) {
    parts.push(`${start} → ${plan.end_date}`);
  } else if (plan.start_date) {
    parts.push(start);
  } else if (plan.end_date) {
    parts.push(plan.end_date);
  } else if (time) {
    parts.push(time);
  }
  if (plan.duration) parts.push(plan.duration);
  const linkCount = plan.links?.length ?? 0;
  if (linkCount > 0) parts.push(`🔗 ${linkCount}`);
  return parts.join(" · ");
}

/** Chronological sort. Dated plans first (by date, then time); undated
 * plans always last, whatever the direction. */
export function sortPlans(plans: Plan[], dir: PlanSort): Plan[] {
  const key = (p: Plan) =>
    p.start_date ? `${p.start_date}T${p.start_time ?? "00:00:00"}` : null;
  const dated = plans.filter((p) => p.start_date);
  const undated = plans.filter((p) => !p.start_date);
  dated.sort((a, b) => key(a)!.localeCompare(key(b)!));
  if (dir === "latest") dated.reverse();
  return [...dated, ...undated];
}
