import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Segmented, TextButton } from '../components';
import { PLANT_IMAGE } from '../plants/images';
import { MODELS, PHASE_LABEL, Plan, programImage, totalWeeks } from '../plants/plans';
import { Plans } from '../plants/usePlans';
import { useTheme } from '../theme';

type Props = {
  plans: Plans;
  bedIndex: number;
  starting: boolean;
  selectedKey: string | null;
  onSelect: (plan: Plan) => void;
  onEdit: (plan: Plan) => void;
  onCreate: () => void;
  onBack: () => void;
};

const MODEL_OPTIONS = MODELS.map(({ model }) => ({ value: model, label: model }));

function summary(plan: Plan): string {
  const phases = plan.stages
    .map((stage) => PHASE_LABEL[stage.phase])
    .filter((label, index, all) => all.indexOf(label) === index);
  return `${totalWeeks(plan)} Wochen · ${phases.join(', ')}`;
}

export function PlansScreen({
  plans,
  bedIndex,
  starting,
  selectedKey,
  onSelect,
  onEdit,
  onCreate,
  onBack,
}: Props) {
  const theme = useTheme();
  const model = MODELS.find((entry) => entry.model === plans.model)!;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TextButton theme={theme} label="Zurück" onPress={onBack} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>
        {starting ? `Beet ${bedIndex + 1} starten` : `Plan für Beet ${bedIndex + 1}`}
      </Text>
      {starting ? (
        <Text style={[styles.note, { color: theme.muted }]}>
          Wähle einen Plan. Das Beet beginnt damit heute in Woche 1.
        </Text>
      ) : null}

      <Text style={[styles.label, { color: theme.text }]}>Dein Modell</Text>
      <Segmented theme={theme} options={MODEL_OPTIONS} selected={plans.model} onSelect={plans.setModel} />
      <Text style={[styles.note, { color: theme.muted }]}>
        {model.name}: {model.description}. Die Düngermengen der mitgelieferten Pläne richten sich nach
        der Tankgröße.
      </Text>

      {plans.plans.map((plan) => {
        const selected = plan.key === selectedKey;
        return (
          <Pressable
            key={plan.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(plan)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: theme.surface,
                borderColor: selected ? theme.accent : theme.border,
                borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Image
              source={PLANT_IMAGE[programImage(plan)]}
              style={styles.rowImage}
              accessibilityIgnoresInvertColors
            />
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{plan.name}</Text>
              <Text style={[styles.note, { color: theme.muted }]}>
                {plan.builtIn ? summary(plan) : `Eigener Plan · ${summary(plan)}`}
              </Text>
            </View>
            {plan.builtIn ? null : (
              <TextButton theme={theme} label="Bearbeiten" onPress={() => onEdit(plan)} />
            )}
          </Pressable>
        );
      })}

      <PrimaryButton theme={theme} label="Eigenen Plan anlegen" onPress={onCreate} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  header: { flexDirection: 'row', marginTop: 8 },
  title: { fontSize: 26, fontWeight: '700' },
  label: { fontSize: 16, fontWeight: '600' },
  note: { fontSize: 14, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  rowImage: { width: 52, height: 52 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 17, fontWeight: '600' },
});
