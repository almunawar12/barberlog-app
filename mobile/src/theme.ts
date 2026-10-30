/**
 * Brand: charcoal #171717, ivory #FAF7F2, copper #BE7C48 (same tokens as the web app).
 * Copper on ivory is only 3.19:1, so it is limited to focus/active indicators.
 * Small copper text uses accentText (6.09:1); input borders use #8C8478 (3.46:1).
 */
export const colors = {
  background: '#FAF7F2',
  foreground: '#171717',
  card: '#FFFFFF',
  primary: '#171717',
  primaryForeground: '#FAF7F2',
  secondary: '#EFE9DF',
  mutedForeground: '#5F5A53',
  accent: '#BE7C48',
  accentText: '#8A4F25',
  destructive: '#B42318',
  destructiveForeground: '#FFFFFF',
  border: '#E4DED4',
  input: '#8C8478',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { md: 8, lg: 12 } as const;

/** Minimum touch target in dp (WCAG/Material: 44-48). */
export const touchTarget = 48;
