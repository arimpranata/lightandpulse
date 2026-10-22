import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Field } from '@/components/field';
import { Button, Card, Notice, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { api, ApiClientError } from '@/services/backend';
import { usePortal } from '@/state/portal';

/** Partner portal entry: sign in, then the tools for the account's role (spec §18, §25, §33). */
export default function PortalHome() {
  const { d, f } = useI18n();
  const { session, setSession } = usePortal();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      setSession(await api.login(email.trim(), password));
      setPassword('');
    } catch (caught) {
      setError(f(d.portal.error, { message: caught instanceof ApiClientError ? caught.message : String(caught) }));
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <Screen title={d.portal.title}>
        <AppText variant="body">{d.portal.intro}</AppText>
        <Card style={styles.form}>
          <Field label={d.account.email} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label={d.account.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" error={error} />
          <Button label={d.portal.signIn} onPress={signIn} loading={busy} disabled={!email || !password} />
        </Card>
      </Screen>
    );
  }

  const role = session.user.role;
  return (
    <Screen title={d.portal.title}>
      <AppText variant="caption">{f(d.profile.signedInAs, { email: session.user.email ?? '' })}</AppText>
      {role === 'traveller' && (
        <Notice icon="info" tone="info">
          <AppText variant="body">{d.portal.travellerOnly}</AppText>
        </Notice>
      )}
      <Section title={d.portal.title}>
        {role === 'vendor' && <Button label={d.portal.vendor} icon="person" onPress={() => router.push('/portal/vendor')} />}
        {role === 'admin' && <Button label={d.portal.admin} icon="shield" onPress={() => router.push('/portal/admin')} />}
        {(role === 'admin' || role === 'cultural_reviewer') && (
          <Button label={d.portal.rules} icon="respect" variant="secondary" onPress={() => router.push('/portal/rules')} />
        )}
        <Button label={d.portal.signOut} variant="ghost" onPress={() => setSession(null)} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.md },
});
