import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useCreateTrip } from "../../domain/trips/useCreateTrip";

export function CreateTripScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const mutation = useCreateTrip();

  const canSubmit = name.trim().length > 0 && !mutation.isPending;

  async function onSubmit() {
    if (!canSubmit) return;
    try {
      await mutation.mutateAsync({ name: name.trim() });
      router.back();
    } catch {
      // Error is surfaced below via `mutation.error`.
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder="e.g. Italy 2026"
        style={styles.input}
        editable={!mutation.isPending}
      />

      {mutation.isError && (
        <Text style={styles.error}>
          Could not create the trip:{" "}
          {String(mutation.error.message ?? mutation.error)}
        </Text>
      )}

      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  label: { fontSize: 14, color: "#444" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#0a6b2e",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#b00020", fontSize: 14 },
});
