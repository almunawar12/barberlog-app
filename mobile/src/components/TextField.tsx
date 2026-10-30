import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { colors, radius, spacing, touchTarget } from '@/theme';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

/** Label, input and an inline message that screen readers announce together. */
export function TextField({ label, error, hint, style, onFocus, onBlur, ...props }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          focused && styles.focused,
          error ? styles.invalid : undefined,
          style,
        ]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  input: {
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.foreground,
  },
  focused: { borderColor: colors.accent, borderWidth: 2 },
  invalid: { borderColor: colors.destructive },
  error: { fontSize: 14, color: colors.destructive },
  hint: { fontSize: 14, color: colors.mutedForeground },
});
