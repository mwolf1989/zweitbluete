import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Stepper, TextButton } from '../components';
import {
  assessReadings,
  fertiliserHint,
  Level,
  PHASE_LABEL,
  progressImage,
  stageAt,
  weeksSince,
} from '../plants/plans';
import { PLANT_IMAGE } from '../plants/images';
import { Plans } from '../plants/usePlans';
import {
  deviceClockSeconds,
  isLightOnAt,
  isSnoozedAt,
  lightEndMinuteOfDay,
  LightSchedule,
  MINUTES_PER_DAY,
  SNOOZE_SECONDS,
} from '../protocol';
import { Theme, useTheme } from '../theme';
import { Garden } from '../useGarden';

type Props = {
  garden: Garden;
  plans: Plans;
  error: string | null;
  onSaveLight: (light: LightSchedule) => Promise<void>;
  onChoosePlan: (bedIndex: number) => void;
  onStartBed: (bedIndex: number) => void;
  onEmptyBed: (bedIndex: number) => void;
  onDisconnect: () => void;
};

const START_STEP_MINUTES = 15;
const DURATION_STEP_MINUTES = 30;
const INTENSITY_STEP_PERCENT = 10;

function clock(minuteOfDay: number): string {
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function intensityPercent(light: LightSchedule): number {
  return Math.round((light.intensity / 255) * 100);
}

function sameLight(a: LightSchedule, b: LightSchedule): boolean {
  return (
    a.startHour === b.startHour &&
    a.startMinute === b.startMinute &&
    a.durationMinutes === b.durationMinutes &&
    a.intensity === b.intensity
  );
}

export function GardenScreen({
  garden,
  plans,
  error,
  onSaveLight,
  onChoosePlan,
  onStartBed,
  onEmptyBed,
  onDisconnect,
}: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState(garden.light);
  const [saving, setSaving] = useState(false);

  // Reset the draft when the device reports a new stored schedule.
  const [storedLight, setStoredLight] = useState(garden.light);
  if (storedLight !== garden.light) {
    setStoredLight(garden.light);
    setDraft(garden.light);
  }

  const now = new Date();
  const beds = garden.beds.map((bed, index) => {
    if (!bed.startedAt) {
      return null;
    }
    const plan = plans.planForBed(index, bed.programId);
    const week = weeksSince(bed.startedAt, now);
    return { plan, week, stage: stageAt(plan, week) };
  });
  const growing = beds.filter((bed) => bed !== null);
  const recommendedLightHours = growing.length
    ? Math.max(...growing.map((bed) => bed.stage.lightHours))
    : null;
  const assessment =
    garden.status && growing.length
      ? assessReadings(growing[0].plan, growing[0].week, garden.status)
      : null;

  const dirty = !sameLight(draft, garden.light);
  const startMinuteOfDay = draft.startHour * 60 + draft.startMinute;

  const shiftStart = (delta: number) => {
    const next = (startMinuteOfDay + delta + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    setDraft({ ...draft, startHour: Math.floor(next / 60), startMinute: next % 60 });
  };
  const shiftDuration = (delta: number) => {
    const next = Math.min(MINUTES_PER_DAY - 1, Math.max(0, draft.durationMinutes + delta));
    setDraft({ ...draft, durationMinutes: next });
  };
  const shiftIntensity = (delta: number) => {
    const percent = Math.min(100, Math.max(0, intensityPercent(draft) + delta));
    setDraft({ ...draft, intensity: Math.round((percent * 255) / 100) });
  };

  const save = async () => {
    setSaving(true);
    await onSaveLight(draft);
    setSaving(false);
  };

  const status = garden.status;
  const snoozed = isSnoozedAt(garden.light, now);
  const lightOn = !snoozed && isLightOnAt(garden.light, now) && garden.light.intensity > 0;

  const toggleSnooze = () =>
    onSaveLight({
      ...garden.light,
      snoozeUntil: snoozed ? 0 : deviceClockSeconds(new Date()) + SNOOZE_SECONDS,
    });

  const confirmRestart = (bedIndex: number) =>
    Alert.alert(
      `Beet ${bedIndex + 1}`,
      'Neu starten setzt das Beet auf Woche 1 zurück. Leeren markiert es als nicht bepflanzt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Leeren', style: 'destructive', onPress: () => onEmptyBed(bedIndex) },
        { text: 'Neu starten', onPress: () => onStartBed(bedIndex) },
      ],
    );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>{garden.name}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            smartGarten {plans.model} · Firmware {garden.firmware}
          </Text>
        </View>
        <TextButton theme={theme} label="Trennen" onPress={onDisconnect} />
      </View>

      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

      <View style={styles.tiles}>
        <Tile
          theme={theme}
          label="Wasserstand"
          value={status ? `${Math.round(status.waterLevelPercent)} %` : '–'}
          level={assessment?.water}
        />
        <Tile
          theme={theme}
          label="Temperatur"
          value={status ? `${status.airTemperatureCelsius.toFixed(1).replace('.', ',')} °C` : '–'}
          level={assessment?.temperature}
        />
        <Tile
          theme={theme}
          label="Luftfeuchte"
          value={status ? `${Math.round(status.humidityPercent)} %` : '–'}
          level={assessment?.humidity}
        />
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Licht</Text>
          <Text style={[styles.badge, { color: theme.accent, backgroundColor: theme.accentSoft }]}>
            {snoozed ? 'Pausiert' : lightOn ? 'An' : 'Aus'}
          </Text>
        </View>

        <Stepper
          theme={theme}
          label="Sonnenaufgang"
          value={clock(startMinuteOfDay)}
          onDecrease={() => shiftStart(-START_STEP_MINUTES)}
          onIncrease={() => shiftStart(START_STEP_MINUTES)}
        />
        <Stepper
          theme={theme}
          label="Dauer"
          value={durationLabel(draft.durationMinutes)}
          onDecrease={() => shiftDuration(-DURATION_STEP_MINUTES)}
          onIncrease={() => shiftDuration(DURATION_STEP_MINUTES)}
        />
        <Stepper
          theme={theme}
          label="Helligkeit"
          value={`${intensityPercent(draft)} %`}
          onDecrease={() => shiftIntensity(-INTENSITY_STEP_PERCENT)}
          onIncrease={() => shiftIntensity(INTENSITY_STEP_PERCENT)}
        />

        <Text style={[styles.note, { color: theme.muted }]}>
          Sonnenuntergang um {clock(lightEndMinuteOfDay(draft))} Uhr.
          {recommendedLightHours === null
            ? ''
            : ` Für deine Pflanzen empfohlen: ${recommendedLightHours} h Licht pro Tag.`}
        </Text>

        <PrimaryButton
          theme={theme}
          label={saving ? 'Speichere …' : 'Speichern'}
          disabled={!dirty || saving}
          onPress={save}
        />
        <View style={styles.centered}>
          <TextButton
            theme={theme}
            label={snoozed ? 'Pause beenden' : 'Licht 30 min pausieren'}
            onPress={toggleSnooze}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Beete</Text>
        {beds.map((bed, index) =>
          bed === null ? (
            <View key={index} style={styles.bed}>
              <View style={[styles.bedImage, styles.bedEmpty, { borderColor: theme.border }]} />
              <View style={styles.bedText}>
                <Text style={[styles.bedTitle, { color: theme.text }]}>Beet {index + 1}</Text>
                <Text style={[styles.note, { color: theme.muted }]}>Nicht gestartet</Text>
              </View>
              <TextButton theme={theme} label="Starten" onPress={() => onStartBed(index)} />
            </View>
          ) : (
            <View key={index} style={styles.bed}>
              <Image
                source={PLANT_IMAGE[progressImage(bed.plan, bed.week)]}
                style={styles.bedImage}
                accessibilityIgnoresInvertColors
              />
              <View style={styles.bedText}>
                <Text style={[styles.bedTitle, { color: theme.text }]}>
                  Beet {index + 1}: {bed.plan.name}
                </Text>
                <Text style={[styles.note, { color: theme.muted }]}>
                  Woche {bed.week + 1} · {PHASE_LABEL[bed.stage.phase]}
                </Text>
                <Text style={[styles.note, { color: theme.muted }]}>{fertiliserHint(bed.stage)}</Text>
                <View style={styles.bedActions}>
                  <TextButton theme={theme} label="Plan ändern" onPress={() => onChoosePlan(index)} />
                  <TextButton theme={theme} label="Neu starten" onPress={() => confirmRestart(index)} />
                </View>
              </View>
            </View>
          ),
        )}
      </View>
    </ScrollView>
  );
}

function levelColor(theme: Theme, level: Level): string {
  return level === 'green' ? theme.accent : level === 'yellow' ? theme.warning : theme.danger;
}

const LEVEL_LABEL: Record<Level, string> = { green: 'gut', yellow: 'grenzwertig', red: 'kritisch' };

function Tile(props: { theme: Theme; label: string; value: string; level?: Level }) {
  const { theme, level } = props;
  return (
    <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.tileValue, { color: theme.text }]}>{props.value}</Text>
      <Text style={[styles.tileLabel, { color: theme.muted }]}>{props.label}</Text>
      {level ? (
        <View style={styles.level}>
          <View style={[styles.dot, { backgroundColor: levelColor(theme, level) }]} />
          <Text style={[styles.tileLabel, { color: levelColor(theme, level) }]}>{LEVEL_LABEL[level]}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  headerText: { flex: 1 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  error: { fontSize: 15, lineHeight: 20 },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  tileValue: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tileLabel: { fontSize: 13 },
  level: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  card: { padding: 18, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, gap: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 19, fontWeight: '700' },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  note: { fontSize: 14, lineHeight: 20 },
  bed: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bedImage: { width: 76, height: 76 },
  bedEmpty: { borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed' },
  bedText: { flex: 1, gap: 2 },
  bedActions: { flexDirection: 'row', gap: 24, marginTop: 8 },
  centered: { alignItems: 'center' },
  bedTitle: { fontSize: 16, fontWeight: '600' },
});
