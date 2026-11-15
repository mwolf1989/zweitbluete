import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { TextButton } from './components';
import { Theme } from './theme';

type Props = {
  theme: Theme;
  value: Date;
  onChange: (date: Date) => void;
};

const formatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function StartDate({ theme, value, onChange }: Props) {
  const picked = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'set' && date) {
      onChange(date);
    }
  };

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.muted }]}>Gestartet am</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="compact"
          maximumDate={new Date()}
          locale="de-DE"
          accentColor={theme.accent}
          onChange={picked}
        />
      ) : (
        <TextButton
          theme={theme}
          label={formatter.format(value)}
          onPress={() =>
            DateTimePickerAndroid.open({ value, mode: 'date', maximumDate: new Date(), onChange: picked })
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  label: { fontSize: 14 },
});
