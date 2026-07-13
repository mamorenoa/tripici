import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      <Text style={styles.label}>{t("common.name")}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder={t("trips.namePlaceholder")}
        style={styles.input}
        editable={!mutation.isPending}
      />

      {mutation.isError && (
        <Text style={styles.error}>
          {t("trips.createError", {
            error: String(mutation.error.message ?? mutation.error),
          })}
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
          <Text style={styles.buttonText}>{t("common.create")}</Text>
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
