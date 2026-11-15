import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { FoundGarden } from '../ble';
import { TextButton } from '../components';
import { DEMO_GARDEN } from '../demo';
import { useTheme } from '../theme';

type Props = {
  bluetoothOn: boolean;
  permitted: boolean | null;
  found: FoundGarden[];
  connectingTo: string | null;
  nothingFound: boolean;
  error: string | null;
  onConnect: (garden: FoundGarden) => void;
};

export function ScanScreen({
  bluetoothOn,
  permitted,
  found,
  connectingTo,
  nothingFound,
  error,
  onConnect,
}: Props) {
  const theme = useTheme();

  let hint: string;
  if (permitted === false) {
    hint = 'Ohne Bluetooth-Berechtigung kann die App deinen smartGarten nicht finden. Erlaube sie in den Einstellungen.';
  } else if (!bluetoothOn) {
    hint = 'Bluetooth ist ausgeschaltet. Schalte es ein, um deinen smartGarten zu finden.';
  } else if (connectingTo) {
    hint = `Verbinde mit ${connectingTo} …`;
  } else if (found.length === 0 && nothingFound) {
    hint =
      'Noch kein smartGarten gefunden. Ist er eingeschaltet und in der Nähe? Er lässt nur eine Verbindung zu, also darf kein anderes Gerät mit ihm verbunden sein.';
  } else if (found.length === 0) {
    hint = 'Suche nach smartGärten in der Nähe …';
  } else {
    hint = 'Tippe auf deinen smartGarten, um ihn zu verbinden.';
  }
  const busy = permitted !== false && bluetoothOn && (connectingTo !== null || found.length === 0);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/welcome.png')}
        style={styles.hero}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text style={[styles.title, { color: theme.text }]}>Zweitblüte</Text>
      <View style={styles.hintRow}>
        {busy ? <ActivityIndicator color={theme.accent} /> : null}
        <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text>
      </View>

      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

      {connectingTo
        ? null
        : found.map((garden) => (
            <Pressable
              key={garden.id}
              accessibilityRole="button"
              onPress={() => onConnect(garden)}
              style={({ pressed }) => [
                styles.device,
                { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.deviceName, { color: theme.text }]}>{garden.name}</Text>
              <Text style={[styles.deviceAction, { color: theme.accent }]}>Verbinden</Text>
            </Pressable>
          ))}

      {connectingTo ? null : (
        <View style={styles.demo}>
          <TextButton theme={theme} label="Demo-Garten ansehen" onPress={() => onConnect(DEMO_GARDEN)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  hero: { width: '100%', height: undefined, aspectRatio: 4 / 3, borderRadius: 24, marginTop: 8 },
  title: { fontSize: 32, fontWeight: '700', marginTop: 8 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: { flex: 1, fontSize: 16, lineHeight: 22 },
  error: { fontSize: 15, lineHeight: 20 },
  device: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  demo: { alignItems: 'flex-start', marginTop: 8 },
  deviceName: { fontSize: 17, fontWeight: '600' },
  deviceAction: { fontSize: 16, fontWeight: '600' },
});
