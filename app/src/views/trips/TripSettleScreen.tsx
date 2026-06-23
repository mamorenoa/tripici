import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { Avatar } from "../../components/Avatar";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { useCurrentUser } from "../../domain/auth/useCurrentUser";
import type {
  MemberBalance,
  Settlement,
} from "../../domain/settlements/types";
import { useTripSettlement } from "../../domain/settlements/useTripSettlement";
import { useTrip } from "../../domain/trips/useTrip";
import { formatEuros } from "../../lib/money";

// ── Section: balances ─────────────────────────────────────────────

function BalancesSection({
  rows,
  currentUserId,
}: {
  rows: MemberBalance[];
  currentUserId?: string;
}) {
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        Balances
      </Text>
      {rows.map((r) => {
        const you = r.user_id === currentUserId;
        const owes = r.balance_cents < 0;
        const settled = r.balance_cents === 0;
        return (
          <View key={r.user_id} className="flex-row items-center gap-2">
            <Avatar name={r.display_name} size={24} />
            <Text className="flex-1 text-sm text-ink-primary">
              {r.display_name}
              {you ? " (you)" : ""}
            </Text>
            {settled ? (
              <Text className="text-sm text-ink-muted">settled</Text>
            ) : (
              <Text
                className={`text-sm font-semibold ${
                  owes ? "text-danger-500" : "text-brand-600"
                }`}
              >
                {owes ? "owes " : "gets back "}
                {formatEuros(Math.abs(r.balance_cents))}
              </Text>
            )}
          </View>
        );
      })}
    </Card>
  );
}

// ── Section: who owes whom ────────────────────────────────────────

function SettlementsSection({
  rows,
  currentUserId,
}: {
  rows: Settlement[];
  currentUserId?: string;
}) {
  return (
    <Card className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        Who owes whom
      </Text>
      {rows.map((r, i) => {
        const involvesYou =
          r.from_user_id === currentUserId || r.to_user_id === currentUserId;
        return (
          <View
            key={`${r.from_user_id}-${r.to_user_id}-${i}`}
            className="flex-row items-center gap-2"
          >
            <Text
              className={`flex-1 text-sm ${
                involvesYou
                  ? "text-ink-primary font-medium"
                  : "text-ink-secondary"
              }`}
            >
              {r.from_name} → {r.to_name}
            </Text>
            <Text className="text-sm font-semibold text-ink-primary">
              {formatEuros(r.amount_cents)}
            </Text>
          </View>
        );
      })}
    </Card>
  );
}

// ── Screen ────────────────────────────────────────────────────────

export function TripSettleScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: trip } = useTrip(tripId);
  const { data: currentUser } = useCurrentUser();
  const { data, isLoading, error } = useTripSettlement(tripId);

  const settled = !data || data.settlements.length === 0;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: trip?.name ? `${trip.name} · Settle up` : "Settle up",
        }}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-ink-muted text-center">
            Could not load the settlement.
          </Text>
        </View>
      ) : settled ? (
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon="check"
            title="All settled"
            description="No member-paid expenses to settle yet. Add expenses paid by a specific person to see who owes whom."
          />
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-4 py-4 gap-4 pb-10">
          <BalancesSection
            rows={data.balances}
            currentUserId={currentUser?.id}
          />
          <SettlementsSection
            rows={data.settlements}
            currentUserId={currentUser?.id}
          />
        </ScrollView>
      )}
    </View>
  );
}
