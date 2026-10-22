import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Field } from '@/components/field';
import { Button, Card, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { api, ApiClientError } from '@/services/backend';
import { useApp } from '@/state/app-store';

/** Traveller account: turn the guest session into an account, or sign in on a new device. */
export default function AccountScreen() {
  const { d, f } = useI18n();
  const { session, signIn } = useApp();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const next =
        mode === 'register'
          ? await api.register(session?.token ?? null, { name: name.trim(), email: email.trim(), password })
          : await api.login(email.trim(), password);
      if (next.user.role !== 'traveller') throw new ApiClientError(403, 'FORBIDDEN', d.portal.travellerOnly);
      signIn(next);
      router.back();
    } catch (caught) {
      setError(f(d.account.failed, { message: caught instanceof ApiClientError ? caught.message : String(caught) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={d.account.title}>
      <Card style={styles.form}>
        {mode === 'register' && <Field label={d.account.name} value={name} onChangeText={setName} autoComplete="name" />}
        <Field label={d.account.email} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field
          label={d.account.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'register' ? 'new-password' : 'password'}
          hint={mode === 'register' ? d.account.passwordHint : undefined}
          error={error}
        />
        {mode === 'register' && session?.user.guest && <AppText variant="caption">{d.account.keepsBookings}</AppText>}
        <Button label={mode === 'register' ? d.account.register : d.account.login} onPress={submit} loading={busy} />
        <Button
          label={mode === 'register' ? d.account.haveAccount : d.account.needAccount}
          variant="ghost"
          onPress={() => setMode(mode === 'register' ? 'login' : 'register')}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.md },
});
