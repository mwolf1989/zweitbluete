import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { TextButton } from './components';
import { locale, t } from './i18n';
import { Theme } from './theme';

type Props = {
  theme: Theme;
  value: Date;
  onChange: (date: Date) => void;
};

export function StartDate({ theme, value, onChange }: Props) {
  const picked = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'set' && date) {
      onChange(date);
    }
  };

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.muted }]}>{t('started_on')}</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="compact"
          maximumDate={new Date()}
          locale={locale()}
          accentColor={theme.accent}
          onChange={picked}
        />
      ) : (
        <TextButton
          theme={theme}
          label={new Intl.DateTimeFormat(locale(), { dateStyle: 'medium' }).format(value)}
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
