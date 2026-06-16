import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { useCurrentUser } from "../../domain/auth/useCurrentUser";
import { useLogout } from "../../domain/auth/useLogout";
import type { Trip } from "../../domain/trips/types";
import { useTrips } from "../../domain/trips/useTrips";

export function TripListScreen() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const { data, isLoading, error, refetch, isRefetching } = useTrips();

  return (
    <View className="flex-1 bg-background">
      {/* Header with greeting + logout */}
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-sm text-ink-secondary">Hi,</Text>
          <Text className="text-xl font-semibold text-ink-primary">
            {user?.display_name ?? ""}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Link href="/stats" asChild>
            <Pressable className="px-3 py-2 flex-row items-center gap-1.5">
              <Icon name="bar-chart-2" size={18} color="#059669" />
              <Text className="text-brand-600 font-semibold text-sm">Stats</Text>
            </Pressable>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <Icon name="log-out" size={18} color="#059669" />
          </Button>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="px-4">
          <Card className="bg-danger-50 border border-danger-500/30">
            <Text className="text-danger-500 font-semibold">
              Could not load trips
            </Text>
            <Text className="text-ink-secondary text-sm mt-1">
              {String(error.message ?? error)}
            </Text>
            <Button
              variant="secondary"
              size="sm"
              className="self-start mt-3"
              onPress={() => refetch()}
            >
              Retry
            </Button>
          </Card>
        </View>
      ) : data && data.length === 0 ? (
        <EmptyState
          icon="compass"
          title="No trips yet"
          description="Create your first trip to start tracking expenses."
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(t, index) => t.id ?? String(index)}
          contentContainerClassName="px-4 pt-2 pb-24 gap-3"
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          renderItem={({ item }: { item: Trip }) => {
            const isShared =
              !!user && !!item.owner_id && item.owner_id !== user.id;
            return (
              <Link href={`/trips/${item.id}`} asChild>
                <Pressable>
                  <Card className="flex-row items-center gap-3">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-semibold text-ink-primary">
                          {item.name}
                        </Text>
                        {isShared ? (
                          <Badge variant="brand">Shared</Badge>
                        ) : null}
                      </View>
                      {item.created_at ? (
                        <Text className="text-xs text-ink-muted mt-0.5">
                          {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                      ) : null}
                    </View>
                    <Icon name="chevron-right" size={18} color="#94a3b8" />
                  </Card>
                </Pressable>
              </Link>
            );
          }}
        />
      )}

      {/* FAB */}
      <Link href="/trips/new" asChild>
        <Pressable className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-brand-600 items-center justify-center shadow-card active:bg-brand-700">
          <Icon name="plus" size={26} color="#ffffff" />
        </Pressable>
      </Link>
    </View>
  );
}
