import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useCurrentUser } from "../../domain/auth/useCurrentUser";
import { useLogout } from "../../domain/auth/useLogout";
import type { Trip } from "../../domain/trips/types";
import { useTrips } from "../../domain/trips/useTrips";

export function TripListScreen() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const { data, isLoading, error, refetch, isRefetching } = useTrips();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {user ? `Hi, ${user.display_name}` : ""}
        </Text>
        <Pressable
          onPress={() => logout.mutate()}
          disabled={logout.isPending}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {isLoading && <ActivityIndicator />}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Could not load trips.</Text>
          <Text style={styles.errorDetail}>{String(error.message ?? error)}</Text>
          <Pressable onPress={() => refetch()} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {data && data.length === 0 && (
        <Text style={styles.empty}>No trips yet. Tap "New trip" to add one.</Text>
      )}

      {data && data.length > 0 && (
        <FlatList
          data={data}
          keyExtractor={(t, index) => t.id ?? String(index)}
          renderItem={({ item }: { item: Trip }) => (
            <Link href={`/trips/${item.id}`} asChild>
              <Pressable style={styles.row}>
                <Text style={styles.tripName}>{item.name}</Text>
                {item.created_at && (
                  <Text style={styles.tripDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                )}
              </Pressable>
            </Link>
          )}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
        />
      )}

      <Link href="/trips/new" asChild>
        <Pressable style={styles.fab}>
          <Text style={styles.fabText}>+ New trip</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: { fontSize: 16, color: "#333", fontWeight: "500" },
  logoutButton: { paddingVertical: 6, paddingHorizontal: 10 },
  logoutText: { color: "#0a6b2e", fontWeight: "600" },
  empty: { color: "#666", textAlign: "center", marginTop: 32 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  tripName: { fontSize: 16 },
  tripDate: { fontSize: 12, color: "#666" },
  fab: {
    backgroundColor: "#0a6b2e",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  fabText: { color: "#fff", fontWeight: "600" },
  errorBox: {
    padding: 16,
    backgroundColor: "#fff3f3",
    borderRadius: 8,
    gap: 8,
  },
  errorText: { color: "#b00020", fontWeight: "600" },
  errorDetail: { color: "#666", fontSize: 12 },
  retry: { paddingVertical: 6, alignSelf: "flex-start" },
  retryText: { color: "#0a6b2e", fontWeight: "600" },
});
