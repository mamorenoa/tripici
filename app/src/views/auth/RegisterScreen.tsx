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

import { useAcceptInvitation } from "../../domain/invitations/useAcceptInvitation";
import { useRegister } from "../../domain/auth/useRegister";

/**
 * Extract an invitation token from a `/invite/<token>` redirect path.
 * Returns ``null`` for anything that isn't an invite link, so the
 * caller can fall back to a plain redirect.
 */
function extractInviteToken(redirect: unknown): string | null {
  if (typeof redirect !== "string") return null;
  const prefix = "/invite/";
  if (!redirect.startsWith(prefix)) return null;
  const rest = redirect.slice(prefix.length);
  // Token charset is base64url; stop at the first non-token character.
  const token = rest.split(/[/?#]/)[0];
  return token.length > 0 ? token : null;
}

export function RegisterScreen() {
  const router = useRouter();
  // See `LoginScreen` — used to send the user back to the intended URL
  // after a successful signup (e.g., an invite link).
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useRegister();
  const acceptMutation = useAcceptInvitation();

  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    !mutation.isPending &&
    !acceptMutation.isPending;

  async function onSubmit() {
    if (!canSubmit) return;
    try {
      await mutation.mutateAsync({
        email: email.trim(),
        password,
        display_name: displayName.trim(),
      });

      // If the registration was triggered by an invite link, the user
      // clearly meant to join the trip — auto-accept the token here and
      // jump straight to the trip detail. Skipping the intermediate
      // preview/Join screen matches the user's intent and avoids the
      // race we'd otherwise hit while the new session settles.
      const inviteToken = extractInviteToken(redirect);
      if (inviteToken) {
        try {
          const trip = await acceptMutation.mutateAsync(inviteToken);
          router.replace(`/trips/${trip.id}`);
          return;
        } catch {
          // Invitation expired / revoked / unknown: fall through to a
          // plain redirect so the user sees the "no longer valid"
          // screen rendered by AcceptInvitationScreen.
        }
      }

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
      <Text style={styles.title}>Create account</Text>

      <Text style={styles.label}>Display name</Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        autoFocus
        style={styles.input}
        editable={!mutation.isPending}
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        style={styles.input}
        editable={!mutation.isPending}
      />

      <Text style={styles.label}>Password (min 8)</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        style={styles.input}
        editable={!mutation.isPending}
      />

      {mutation.isError && (
        <Text style={styles.error}>
          Could not create account. The email may already be in use.
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
          <Text style={styles.buttonText}>Sign up</Text>
        )}
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Link
          href={
            typeof redirect === "string" && redirect.length > 0
              ? `/login?redirect=${encodeURIComponent(redirect)}`
              : "/login"
          }
          style={styles.link}
        >
          Sign in
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
