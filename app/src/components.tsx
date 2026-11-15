import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from './i18n';
import { Theme } from './theme';

export function Stepper(props: {
  theme: Theme;
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const { theme } = props;
  const button = (symbol: string, hint: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${props.label} ${hint}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepButton,
        { backgroundColor: theme.accentSoft, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.stepSymbol, { color: theme.accent }]}>{symbol}</Text>
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      <Text style={[styles.stepLabel, { color: theme.text }]}>{props.label}</Text>
      {button('−', t('decrease'), props.onDecrease)}
      <Text style={[styles.stepValue, { color: theme.text }]}>{props.value}</Text>
      {button('+', t('increase'), props.onIncrease)}
    </View>
  );
}

export function Segmented<Value extends string>(props: {
  theme: Theme;
  options: { value: Value; label: string }[];
  selected: Value | null;
  onSelect: (value: Value) => void;
}) {
  const { theme } = props;
  return (
    <View style={[styles.segmented, { backgroundColor: theme.accentSoft }]}>
      {props.options.map((option) => {
        const active = option.value === props.selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => props.onSelect(option.value)}
            style={[styles.segment, active ? { backgroundColor: theme.accent } : null]}
          >
            <Text style={[styles.segmentText, { color: active ? theme.onAccent : theme.accent }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PrimaryButton(props: {
  theme: Theme;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { theme, disabled } = props;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: theme.accent, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.primaryText, { color: theme.onAccent }]}>{props.label}</Text>
    </Pressable>
  );
}

export function TextButton(props: { theme: Theme; label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={props.onPress} hitSlop={12}>
      <Text style={[styles.link, { color: props.danger ? props.theme.danger : props.theme.accent }]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepLabel: { flex: 1, fontSize: 16 },
  stepValue: {
    minWidth: 92,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  stepButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stepSymbol: { fontSize: 24, fontWeight: '500', lineHeight: 28 },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 3 },
  segment: { flex: 1, minHeight: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 15, fontWeight: '600' },
  primary: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 17, fontWeight: '700' },
  link: { fontSize: 16, fontWeight: '600' },
});
