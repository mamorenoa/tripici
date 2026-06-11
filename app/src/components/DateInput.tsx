import DateTimePicker from "@react-native-community/datetimepicker";
import { createElement, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

type Props = {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  editable?: boolean;
  error?: string;
};

function isoFromDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateFromIso(value: string): Date {
  // Treat as local-noon to avoid timezone roll-over.
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
}

/**
 * Cross-platform date input.
 *
 * - Web: renders the browser's native `<input type="date">` (calendar
 *   popup + keyboard accessibility for free).
 * - Native: opens the platform's `DateTimePicker` on tap.
 *
 * The API works in `YYYY-MM-DD` strings to match how callers store
 * the value (the API contract uses the same shape).
 */
export function DateInput({
  label,
  value,
  onChange,
  editable = true,
  error,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const borderColor = error ? "border-danger-500" : "border-border";

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm text-ink-secondary font-medium">{label}</Text>
      ) : null}

      {Platform.OS === "web"
        ? createElement("input", {
            type: "date",
            value,
            disabled: !editable,
            onChange: (e: { target: { value: string } }) =>
              onChange(e.target.value),
            // We can't apply NativeWind to a raw DOM input; inline style
            // keeps it consistent with the RN Inputs above.
            style: {
              border: `1px solid ${error ? "#e11d48" : "#e2e8f0"}`,
              borderRadius: 16,
              padding: "12px 14px",
              fontSize: 16,
              fontFamily: "Inter_400Regular, system-ui",
              color: "#0f172a",
              backgroundColor: "#ffffff",
              opacity: editable ? 1 : 0.6,
              outline: "none",
            },
          })
        : (
            <>
              <Pressable
                onPress={() => editable && setPickerOpen(true)}
                disabled={!editable}
                className={`border ${borderColor} rounded-2xl px-3.5 py-3 bg-surface ${
                  !editable ? "opacity-60" : ""
                }`}
              >
                <Text className="text-base text-ink-primary">{value}</Text>
              </Pressable>
              {pickerOpen ? (
                <DateTimePicker
                  value={dateFromIso(value)}
                  mode="date"
                  onChange={(event, selected) => {
                    setPickerOpen(false);
                    if (event.type === "set" && selected) {
                      onChange(isoFromDate(selected));
                    }
                  }}
                />
              ) : null}
            </>
          )}

      {error ? (
        <Text className="text-xs text-danger-500">{error}</Text>
      ) : null}
    </View>
  );
}
