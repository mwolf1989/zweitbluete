import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton, Segmented, Stepper, TextButton } from '../components';
import { Phase, PHASE_LABEL, PHASES, Plan, PlanStage, STAGE_LIMITS, totalWeeks } from '../plants/plans';
import { useTheme } from '../theme';

type Props = {
  plan: Plan;
  isNew: boolean;
  onSave: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onBack: () => void;
};

type NumericField = keyof typeof STAGE_LIMITS;

const PHASE_OPTIONS = PHASES.map((phase) => ({ value: phase, label: PHASE_LABEL[phase] }));

const decimal = (value: number) => String(value).replace('.', ',');

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

  const stepper = (index: number, field: NumericField, label: string, unit: string) => (
    <Stepper
      theme={theme}
      label={label}
      value={`${decimal(stages[index][field])}${unit}`}
      onDecrease={() => shift(index, field, -1)}
      onIncrease={() => shift(index, field, 1)}
    />
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TextButton theme={theme} label="Abbrechen" onPress={onBack} />
          {isNew ? null : <TextButton theme={theme} label="Löschen" danger onPress={() => onDelete(plan)} />}
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{isNew ? 'Neuer Plan' : 'Plan bearbeiten'}</Text>

        <TextInput
          accessibilityLabel="Name des Plans"
          value={name}
          onChangeText={setName}
          placeholder="Name des Plans"
          placeholderTextColor={theme.muted}
          maxLength={40}
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        />

        <Text style={[styles.note, { color: theme.muted }]}>
          {stages.length} Abschnitte, zusammen {totalWeeks({ ...plan, stages })} Wochen. Nach dem letzten
          Abschnitt gelten dessen Werte weiter.
        </Text>

        {stages.map((stage, index) => (
          <View
            key={index}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Abschnitt {index + 1}</Text>
              {stages.length > 1 ? (
                <TextButton theme={theme} label="Entfernen" danger onPress={() => removeStage(index)} />
              ) : null}
            </View>
            <Segmented
              theme={theme}
              options={PHASE_OPTIONS}
              selected={stage.phase}
              onSelect={(phase: Phase) => change(index, { phase })}
            />
            {stepper(index, 'weeks', 'Dauer', ' Wo.')}
            {stepper(index, 'lightHours', 'Licht pro Tag', ' h')}
            {stepper(index, 'spoonsPerWeek', 'Dünger pro Woche', ' Löffel')}
            {stepper(index, 'spoonsPerLitreRefill', 'Dünger pro Liter', ' Löffel')}
          </View>
        ))}

        <TextButton theme={theme} label="Abschnitt hinzufügen" onPress={addStage} />
        <PrimaryButton theme={theme} label="Plan speichern" disabled={trimmedName === ''} onPress={save} />
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
