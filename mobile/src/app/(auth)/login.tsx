import { Link } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { FormAlert } from '@/components/FormAlert';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { describeWriteError } from '@/lib/errors';
import type { WriteFailure } from '@/lib/errors';
import { id } from '@/locales/id';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<WriteFailure | null>(null);

  async function submit() {
    setFailure(null);
    setBusy(true);

    try {
      await signIn(email.trim(), password);
    } catch (error) {
      // The email stays in the field; only the password is cleared.
      setFailure(describeWriteError(error));
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Image source={require('../../../assets/images/icon.png')} style={styles.logo} accessibilityLabel="BarberLog" />
      <Text accessibilityRole="header" style={styles.title}>
        {id.auth.login}
      </Text>
      {failure && failure.kind !== 'validation' && <FormAlert message={failure.message} />}
      <TextField
        label={id.auth.email}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={failure?.fieldErrors.email}
      />
      <TextField
        label={id.auth.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        error={failure?.fieldErrors.password}
      />
      <Button
        title={busy ? id.auth.loggingIn : id.auth.login}
        loading={busy}
        disabled={email.trim() === '' || password === ''}
        onPress={submit}
      />
      <Link href="/forgot-password" style={styles.link} accessibilityRole="link">
        {id.auth.forgotPassword}
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { width: 96, height: 96, borderRadius: 20, alignSelf: 'center', marginTop: spacing.xl },
  title: { fontSize: 24, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  link: { color: colors.accentText, fontSize: 15, fontWeight: '600', textAlign: 'center', paddingVertical: spacing.md },
});
