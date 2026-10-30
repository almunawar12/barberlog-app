import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { PressableProps } from 'react-native';

import { colors, radius, spacing, touchTarget } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'destructive';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
};

const palette: Record<Variant, { background: string; text: string; border: string }> = {
  primary: { background: colors.primary, text: colors.primaryForeground, border: colors.primary },
  secondary: { background: colors.secondary, text: colors.foreground, border: colors.secondary },
  outline: { background: colors.card, text: colors.foreground, border: colors.input },
  destructive: { background: colors.destructive, text: colors.destructiveForeground, border: colors.destructive },
};

export function Button({ title, variant = 'primary', loading = false, disabled, style, ...props }: ButtonProps) {
  const colorSet = palette[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        { backgroundColor: colorSet.background, borderColor: colorSet.border },
        state.pressed && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      {loading && <ActivityIndicator color={colorSet.text} />}
      <Text style={[styles.text, { color: colorSet.text }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
});
