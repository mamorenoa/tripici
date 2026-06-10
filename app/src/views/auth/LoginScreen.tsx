import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useLogin } from "../../domain/auth/useLogin";

export function LoginScreen() {
  const router = useRouter();
  // ``redirect`` is set by ``(app)/_layout.tsx`` when an unauthenticated
  // user lands on a protected route (e.g., an invitation link). After a
  // successful login we send them back where they wanted to go.
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useLogin();

  const canSubmit =
    email.trim().length > 0 && password.length > 0 && !mutation.isPending;

  async function onSubmit() {
    if (!canSubmit) return;
    try {
      await mutation.mutateAsync({ email: email.trim(), password });
      const target = typeof redirect === "string" && redirect.length > 0
        ? redirect
        : "/";
      router.replace(target);
    } catch {
      // Error surfaced below via mutation.error.
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        autoFocus
        style={styles.input}
        editable={!mutation.isPending}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        style={styles.input}
        editable={!mutation.isPending}
      />

      {mutation.isError && (
        <Text style={styles.error}>Invalid email or password.</Text>
      )}

      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>No account yet?</Text>
        <Link
          href={
            typeof redirect === "string" && redirect.length > 0
              ? `/register?redirect=${encodeURIComponent(redirect)}`
              : "/register"
          }
          style={styles.link}
        >
          Create one
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 8 },
  label: { fontSize: 14, color: "#444", marginTop: 4 },
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
  footer: { flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 12 },
  footerText: { color: "#666" },
  link: { color: "#0a6b2e", fontWeight: "600" },
});
