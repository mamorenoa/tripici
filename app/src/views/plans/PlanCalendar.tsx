import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Icon } from "../../components/Icon";
import type { Plan } from "../../domain/plans/types";
import { PlanCard } from "./PlanCard";
import { isoOf, planOccursOn, todayIso } from "./planUtils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** Month-grid calendar for a trip's plans. Self-contained: give it the
 * plans and it handles month navigation + a selected-day agenda. The
 * narrow props (plans + tripId) make it swappable for a library-backed
 * implementation later without touching the rest of the screen. */
export function PlanCalendar({
  plans,
  tripId,
}: {
  plans: Plan[];
  tripId: string;
}) {
  const today = todayIso();

  // Open on the month of the earliest dated plan, else the current month.
  const earliest = plans
    .map((p) => p.start_date)
    .filter((d): d is string => !!d)
    .sort()[0];
  const initial = earliest ? parseIso(earliest) : new Date();

  const [view, setView] = useState({
    y: initial.getFullYear(),
    m: initial.getMonth(),
  });
  const [selectedDay, setSelectedDay] = useState<string>(today);

  function shiftMonth(delta: number) {
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  // 6-week grid starting on the Monday on/before the 1st.
  const first = new Date(view.y, view.m, 1);
  const leadMon = (first.getDay() + 6) % 7; // Mon=0 .. Sun=6
  const gridStart = new Date(view.y, view.m, 1 - leadMon);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  const weeks: Date[][] = Array.from({ length: 6 }, (_, w) =>
    cells.slice(w * 7, w * 7 + 7),
  );

  const dayPlans = plans.filter((p) => planOccursOn(p, selectedDay));
  const undated = plans.filter((p) => !p.start_date);

  return (
    <ScrollView contentContainerClassName="px-4 pt-2 pb-24 gap-3">
      {/* Month header */}
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} className="p-2">
          <Icon name="chevron-left" size={22} color="#059669" />
        </Pressable>
        <Text className="text-base font-semibold text-ink-primary">
          {MONTHS[view.m]} {view.y}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={8} className="p-2">
          <Icon name="chevron-right" size={22} color="#059669" />
        </Pressable>
      </View>

      {/* Weekday labels */}
      <View className="flex-row">
        {WEEKDAYS.map((w) => (
          <Text
            key={w}
            className="flex-1 text-center text-xs text-ink-muted font-medium"
          >
            {w}
          </Text>
        ))}
      </View>

      {/* Weeks */}
      <View className="gap-1">
        {weeks.map((week, wi) => (
          <View key={wi} className="flex-row gap-1">
            {week.map((d) => {
              const iso = isoOf(d);
              const inMonth = d.getMonth() === view.m;
              const selected = iso === selectedDay;
              const isToday = iso === today;
              const count = plans.filter((p) => planOccursOn(p, iso)).length;
              return (
                <Pressable
                  key={iso}
                  onPress={() => setSelectedDay(iso)}
                  className={`flex-1 items-center py-1.5 rounded-lg ${
                    selected
                      ? "bg-brand-600"
                      : isToday
                        ? "border border-brand-600"
                        : ""
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      selected
                        ? "text-white font-semibold"
                        : inMonth
                          ? "text-ink-primary"
                          : "text-ink-muted"
                    }`}
                  >
                    {d.getDate()}
                  </Text>
                  <View
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      count > 0
                        ? selected
                          ? "bg-white"
                          : "bg-brand-600"
                        : ""
                    }`}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Selected day agenda */}
      <View className="gap-2 mt-1">
        <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
          {selectedDay}
        </Text>
        {dayPlans.length > 0 ? (
          dayPlans.map((p) => (
            <PlanCard key={p.id} plan={p} tripId={tripId} />
          ))
        ) : (
          <Text className="text-sm text-ink-muted">No plans on this day.</Text>
        )}
      </View>

      {/* Undated plans */}
      {undated.length > 0 ? (
        <View className="gap-2 mt-3">
          <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
            No date ({undated.length})
          </Text>
          {undated.map((p) => (
            <PlanCard key={p.id} plan={p} tripId={tripId} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
