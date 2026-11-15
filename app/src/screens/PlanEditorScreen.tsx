import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton, Segmented, Stepper, TextButton } from '../components';
import { spoons, t, weeks } from '../i18n';
import { Phase, phaseLabel, PHASES, Plan, PlanStage, STAGE_LIMITS, totalWeeks } from '../plants/plans';
import { useTheme } from '../theme';

type Props = {
  plan: Plan;
  isNew: boolean;
  onSave: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onBack: () => void;
};

type NumericField = keyof typeof STAGE_LIMITS;

const PHASE_OPTIONS = PHASES.map((phase) => ({ value: phase, label: phaseLabel(phase) }));

export function PlanEditorScreen({ plan, isNew, onSave, onDelete, onBack }: Props) {
  const theme = useTheme();
  const [name, setName] = useState(plan.name);
  const [stages, setStages] = useState(plan.stages);

  const change = (index: number, patch: Partial<PlanStage>) =>
    setStages(stages.map((stage, position) => (position === index ? { ...stage, ...patch } : stage)));

  const shift = (index: number, field: NumericField, direction: 1 | -1) => {
    const { min, max, step } = STAGE_LIMITS[field];
    const next = Math.min(max, Math.max(min, stages[index][field] + direction * step));
    change(index, { [field]: next });
  };

  const addStage = () => setStages([...stages, { ...stages[stages.length - 1] }]);
  const removeStage = (index: number) => setStages(stages.filter((_, position) => position !== index));

  const trimmedName = name.trim();
  const save = () => onSave({ ...plan, name: trimmedName, stages });

  const stepper = (index: number, field: NumericField, label: string, format: (value: number) => string) => (
    <Stepper
      theme={theme}
      label={label}
      value={format(stages[index][field])}
      onDecrease={() => shift(index, field, -1)}
      onIncrease={() => shift(index, field, 1)}
    />
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TextButton theme={theme} label={t('cancel')} onPress={onBack} />
          {isNew ? null : (
            <TextButton theme={theme} label={t('delete')} danger onPress={() => onDelete(plan)} />
          )}
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{t(isNew ? 'new_plan' : 'edit_plan')}</Text>

        <TextInput
          accessibilityLabel={t('plan_name')}
          value={name}
          onChangeText={setName}
          placeholder={t('plan_name')}
          placeholderTextColor={theme.muted}
          maxLength={40}
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        />

        <Text style={[styles.note, { color: theme.muted }]}>
          {t(stages.length === 1 ? 'editor_summary_one' : 'editor_summary_other', {
            count: stages.length,
            weeks: weeks(totalWeeks({ ...plan, stages })),
          })}
        </Text>

        {stages.map((stage, index) => (
          <View
            key={index}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {t('section', { number: index + 1 })}
              </Text>
              {stages.length > 1 ? (
                <TextButton theme={theme} label={t('remove')} danger onPress={() => removeStage(index)} />
              ) : null}
            </View>
            <Segmented
              theme={theme}
              options={PHASE_OPTIONS}
              selected={stage.phase}
              onSelect={(phase: Phase) => change(index, { phase })}
            />
            {stepper(index, 'weeks', t('duration'), (value) => t('unit_weeks', { value }))}
            {stepper(index, 'lightHours', t('light_per_day'), (value) => t('unit_hours', { value }))}
            {stepper(index, 'spoonsPerWeek', t('fertiliser_per_week'), spoons)}
            {stepper(index, 'spoonsPerLitreRefill', t('fertiliser_per_litre'), spoons)}
          </View>
        ))}

        <TextButton theme={theme} label={t('add_section')} onPress={addStage} />
        <PrimaryButton theme={theme} label={t('save_plan')} disabled={trimmedName === ''} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  title: { fontSize: 26, fontWeight: '700' },
  note: { fontSize: 14, lineHeight: 20 },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    fontSize: 17,
  },
  card: { padding: 18, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '700' },
});
