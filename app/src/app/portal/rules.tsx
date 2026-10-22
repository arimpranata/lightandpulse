import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Chip } from '@/components/chip';
import { Field } from '@/components/field';
import { Badge, Button, Card, EmptyState, Notice, Row, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { RuleSeverity } from '@/domain/types';
import { useI18n } from '@/i18n';
import { api, ApiClientError, type ManagedRule } from '@/services/backend';
import { usePortal } from '@/state/portal';

const SEVERITIES: RuleSeverity[] = ['info', 'warning', 'restricted', 'prohibited'];

function RuleForm({ rule, onSave, onCancel }: { rule: ManagedRule; onSave: (rule: ManagedRule) => Promise<void>; onCancel: () => void }) {
  const { d } = useI18n();
  const [draft, setDraft] = useState(rule);
  const [busy, setBusy] = useState(false);
  return (
    <View style={styles.form}>
      <Field label={d.portal.ruleText} value={draft.text.en} onChangeText={(en) => setDraft({ ...draft, text: { ...draft.text, en } })} multiline />
      <Field label={d.portal.ruleTextId} value={draft.text.id ?? ''} onChangeText={(id) => setDraft({ ...draft, text: { ...draft.text, id } })} multiline />
      <AppText variant="label" color="textSecondary">
        {d.portal.severity}
      </AppText>
      <Row style={styles.wrap}>
        {SEVERITIES.map((severity) => (
          <Chip key={severity} label={severity} selected={draft.severity === severity} onPress={() => setDraft({ ...draft, severity })} />
        ))}
      </Row>
      <Field label={d.portal.sourceOwner} value={draft.sourceOwner} onChangeText={(sourceOwner) => setDraft({ ...draft, sourceOwner })} />
      <Row>
        <Button
          label={d.portal.saveRule}
          compact
          loading={busy}
          onPress={() => {
            setBusy(true);
            onSave(draft).finally(() => setBusy(false));
          }}
        />
        <Button label={d.portal.cancel} variant="secondary" compact onPress={onCancel} />
      </Row>
    </View>
  );
}

/** Cultural rule management (spec §16): versioned edits and verification by a named reviewer. */
export default function RulesPortal() {
  const { d, f, language } = useI18n();
  const { session, run } = usePortal();
  const [rules, setRules] = useState<ManagedRule[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const report = useCallback(
    (caught: unknown) => setError(f(d.portal.error, { message: caught instanceof ApiClientError ? caught.message : String(caught) })),
    [d, f],
  );
  const load = useCallback(() => run(api.rules).then((result) => setRules(result.rules), report), [run, report]);
  useEffect(() => {
    load();
  }, [load]);

  if (!session || (session.user.role !== 'admin' && session.user.role !== 'cultural_reviewer')) {
    return (
      <Screen title={d.portal.rules}>
        <EmptyState icon="lock" title={d.portal.travellerOnly} />
      </Screen>
    );
  }

  const save = async (rule: ManagedRule) => {
    setError(null);
    const { id, version: _version, verified: _verified, demo: _demo, verifiedAt: _verifiedAt, ...input } = rule;
    const text = rule.text.id?.trim() ? rule.text : { en: rule.text.en };
    try {
      await run((token) => api.updateRule(token, id, { ...input, text }));
      setEditing(null);
      await load();
    } catch (caught) {
      report(caught);
    }
  };

  return (
    <Screen title={d.portal.rules}>
      <AppText variant="caption">{d.portal.rulesIntro}</AppText>
      {error && (
        <Notice icon="alert" tone="danger">
          <AppText variant="body">{error}</AppText>
        </Notice>
      )}
      <Section title={d.portal.rules}>
        {rules?.map((rule) => (
          <Card key={rule.id}>
            <Row style={styles.wrap}>
              <Badge label={rule.severity} tone={rule.severity === 'prohibited' ? 'danger' : rule.severity === 'info' ? 'info' : 'warning'} />
              <Badge label={rule.verified ? d.portal.verified : d.portal.unverified} tone={rule.verified ? 'verified' : 'pending'} />
              <Badge label={f(d.portal.version, { version: rule.version })} />
              {rule.demo && <Badge label={d.common.demo} tone="demo" />}
            </Row>
            <AppText variant="caption">
              {rule.scopeType}
              {rule.scopeId ? ` · ${rule.scopeId}` : ''} · {rule.kind}
            </AppText>
            {editing === rule.id ? (
              <RuleForm rule={rule} onSave={save} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <AppText variant="body">{(language === 'id' && rule.text.id) || rule.text.en}</AppText>
                <AppText variant="caption">{rule.sourceOwner}</AppText>
                <Row>
                  <Button label={d.portal.edit} variant="secondary" compact onPress={() => setEditing(rule.id)} />
                  {!rule.verified && (
                    <Button
                      label={d.portal.verify}
                      compact
                      onPress={() => run((token) => api.verifyRule(token, rule.id)).then(load, report)}
                    />
                  )}
                </Row>
              </>
            )}
          </Card>
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexWrap: 'wrap' },
  form: { gap: Spacing.md },
});
