import { Button as NativeButton, Host, Menu as NativeMenu } from '@expo/ui/swift-ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { fetchAdminSchema, getAdminResource, setAdminResource } from '@/api/admin';
import { mobileAdminPolicy } from '@/admin/navigation';
import { adminDescriptionZh, adminZh, resolveAdminForm, resolveAdminList, type AdminField } from '@/admin/schema';
import { NativeGlassButton } from '@/components/NativeControls';
import { SettingsDivider, SettingsGroup, SettingsSectionTitle } from '@/components/SettingsList';
import { useAppState } from '@/state/app-state';

const isComplex = (field: AdminField) => ['object', 'objectList', 'set', 'map'].includes(field.type.type);
type FormFieldInfo = { name: string; label: string; placeholder?: string; keyLabel?: string; valueLabel?: string; section?: string };

export default function AdminEditorScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ view: string; id?: string; title?: string }>();
  const policy = mobileAdminPolicy(params.view);
  const { selected, password, preview, interactive } = useAppState();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const schema = useQuery({
    queryKey: ['admin-schema', selected?.id], enabled: Boolean(selected && policy?.mode === 'manage') && interactive && !preview, staleTime: 10 * 60_000,
    queryFn: async () => fetchAdminSchema(selected!, await password())
  });
  const item = useQuery({
    queryKey: ['admin-item', selected?.id, params.view, params.id],
    enabled: Boolean(selected && schema.data && params.id && policy?.mode === 'manage') && interactive && !preview,
    queryFn: async () => getAdminResource(selected!, await password(), schema.data!, params.view, params.id!)
  });
  const resolved = useMemo(() => schema.data ? resolveAdminForm(schema.data, params.view, item.data) : null, [schema.data, params.view, item.data]);
  const fields = resolved?.fields?.properties ?? {};
  const formFields = useMemo<FormFieldInfo[]>(() => {
    if (!resolved) return [];
    if (resolved.form) return resolved.form.sections.flatMap((section) => section.fields.map((field) => ({ ...field, section: section.title })));
    return Object.keys(fields).map((name) => ({ name, label: name, section: undefined }));
  }, [resolved, fields]);
  const formSections = useMemo(() => {
    const result: { title: string; items: typeof formFields }[] = [];
    for (const fieldInfo of formFields) {
      const field = fields[fieldInfo.name];
      if (!field || field.update === 'serverSet' || fieldInfo.name === '@type') continue;
      const title = adminZh(fieldInfo.section || '基本信息');
      let section = result.find((entry) => entry.title === title);
      if (!section) { section = { title, items: [] }; result.push(section); }
      section.items.push(fieldInfo);
    }
    return result;
  }, [fields, formFields]);

  useEffect(() => {
    if (!resolved || ready || (params.id && !item.data)) return;
    const staticValues = resolveAdminList(schema.data!, params.view)?.filtersStatic ?? {};
    const base = { ...resolved.defaults, ...staticValues, ...(resolved.variant ? { '@type': resolved.variant } : {}), ...(item.data ?? {}) };
    setValues(base);
    setReady(true);
  }, [resolved, ready, params.id, item.data, schema.data, params.view]);

  const update = (name: string, value: unknown) => setValues((current) => ({ ...current, [name]: value }));
  const save = async () => {
    if (policy?.mode !== 'manage') return;
    if (preview) { Alert.alert('预览模式', '预览不会修改服务器数据。'); return; }
    if (!schema.data || !selected || !resolved) return;
    setBusy(true); setError(null);
    try {
      const body: Record<string, unknown> = {};
      for (const fieldInfo of formFields) {
        const field = fields[fieldInfo.name];
        if (!field || field.update === 'serverSet' || (params.id && field.update === 'immutable')) continue;
        let value = values[fieldInfo.name];
        if (params.id && field.type.type === 'string' && ['secret', 'secretText'].includes(field.type.format ?? '') && value === '****') continue;
        if (isComplex(field) && typeof value === 'string') {
          if (!value.trim()) value = field.type.type === 'objectList' ? [] : {};
          else value = JSON.parse(value);
        }
        if (field.type.type === 'number' && typeof value === 'string') value = value.trim() ? Number(value) : null;
        body[fieldInfo.name] = value;
      }
      if (resolved.variant) body['@type'] = resolved.variant;
      if (params.id) await setAdminResource(selected, await password(), schema.data, params.view, { update: { [params.id]: body } });
      else await setAdminResource(selected, await password(), schema.data, params.view, { create: { mobile: body } });
      await queryClient.invalidateQueries({ queryKey: ['admin-resource', selected.id, params.view] });
      router.back();
    } catch (reason) {
      setError(reason instanceof SyntaxError ? 'JSON 格式不正确，请检查复杂字段。' : reason instanceof Error ? reason.message : '保存失败');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={[styles.page, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: params.title || (params.id ? '编辑' : '添加'), headerShadowVisible: false }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {policy?.mode !== 'manage' ? <Text style={styles.loading}>为避免影响服务器连接，此配置只能在网页管理后台修改。</Text> : schema.isLoading || (params.id && item.isLoading) ? <Text style={styles.loading}>正在读取服务器表单…</Text> : !resolved ? <Text style={styles.loading}>服务器没有提供可编辑表单</Text> : <>
          <Text variant="bodyMedium" style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>字段、默认值和权限直接来自当前 Stalwart 服务器。</Text>
          {formSections.map((section) => <View key={section.title}>
            <SettingsSectionTitle>{section.title}</SettingsSectionTitle>
            <SettingsGroup>
              {section.items.map((fieldInfo, index) => {
                const field = fields[fieldInfo.name]!;
                const disabled = Boolean(params.id && field.update === 'immutable');
                return <View key={fieldInfo.name}>
                  {index > 0 ? <SettingsDivider /> : null}
                  <FieldControl field={field} label={adminZh(fieldInfo.label)} value={values[fieldInfo.name]} disabled={disabled} enums={schema.data?.enums ?? {}} onChange={(value) => update(fieldInfo.name, value)} />
                </View>;
              })}
            </SettingsGroup>
          </View>)}
          {error && <HelperText type="error" visible>{error}</HelperText>}
          <NativeGlassButton prominent wide label={busy ? '正在保存…' : '保存到服务器'} systemImage="checkmark" isDisabled={busy} onPress={() => void save()} style={styles.save} />
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldControl({ field, label, value, disabled, enums, onChange }: { field: AdminField; label: string; value: unknown; disabled: boolean; enums: Record<string, { name: string; label: string }[]>; onChange(value: unknown): void }) {
  const theme = useTheme();
  if (field.type.type === 'boolean') {
    const description = adminDescriptionZh(field.description);
    return <View style={styles.booleanRow}><View style={styles.booleanText}><Text style={styles.rowTitle}>{label}</Text>{description && <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{description}</Text>}</View><Switch value={Boolean(value)} disabled={disabled} onValueChange={onChange} /></View>;
  }
  if (field.type.type === 'enum') {
    const options = enums[field.type.enumName] ?? [];
    const current = options.find((option) => option.name === value)?.label ?? String(value ?? '选择');
    return <View style={styles.enumRow}><Text style={styles.rowTitle}>{label}</Text><Host matchContents><NativeMenu label={adminZh(current)} systemImage="chevron.up.chevron.down">{options.map((option) => <NativeButton key={option.name} label={adminZh(option.label)} systemImage={option.name === value ? 'checkmark' : undefined} onPress={() => onChange(option.name)} />)}</NativeMenu></Host></View>;
  }
  const complex = isComplex(field);
  const text = complex && typeof value !== 'string' ? JSON.stringify(value ?? {}, null, 2) : value == null ? '' : String(value);
  const description = adminDescriptionZh(field.description);
  return <View style={styles.fieldWrap}><TextInput
    mode="flat" label={label} value={text} disabled={disabled}
    secureTextEntry={field.type.type === 'string' && ['secret', 'secretText'].includes(field.type.format ?? '')}
    multiline={complex || (field.type.type === 'string' && ['text', 'html'].includes(field.type.format ?? ''))}
    keyboardType={field.type.type === 'number' ? 'numeric' : field.type.type === 'string' && field.type.format === 'emailAddress' ? 'email-address' : 'default'}
    autoCapitalize="none" onChangeText={onChange} style={styles.input}
  />{description && <HelperText type="info">{description}</HelperText>}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 },
  loading: { padding: 50, textAlign: 'center' },
  intro: { marginHorizontal: 8, marginBottom: 14, lineHeight: 20 },
  fieldWrap: { minHeight: 58 },
  input: { minHeight: 58, backgroundColor: 'transparent' },
  booleanRow: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  booleanText: { flex: 1, gap: 2 },
  enumRow: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  rowTitle: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  save: { marginTop: 24 }
});
