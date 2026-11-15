import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '../components';
import { t, weeks } from '../i18n';
import { PLANT_IMAGE } from '../plants/images';
import { phaseLabel, Plan, programImage, totalWeeks } from '../plants/plans';
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

function summary(plan: Plan): string {
  const phases = plan.stages
    .map((stage) => phaseLabel(stage.phase))
    .filter((label, index, all) => all.indexOf(label) === index);
  return t('plan_summary', { weeks: weeks(totalWeeks(plan)), phases: phases.join(', ') });
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TextButton theme={theme} label={t('back')} onPress={onBack} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>
        {t(starting ? 'start_bed' : 'plan_for_bed', { number: bedIndex + 1 })}
      </Text>
      {starting ? (
        <Text style={[styles.note, { color: theme.muted }]}>{t('start_bed_note')}</Text>
      ) : null}

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
                {plan.builtIn ? summary(plan) : t('custom_plan_summary', { summary: summary(plan) })}
              </Text>
            </View>
            {plan.builtIn ? null : (
              <TextButton theme={theme} label={t('edit')} onPress={() => onEdit(plan)} />
            )}
          </Pressable>
        );
      })}

      <PrimaryButton theme={theme} label={t('create_plan')} onPress={onCreate} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  header: { flexDirection: 'row', marginTop: 8 },
  title: { fontSize: 26, fontWeight: '700' },
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
