import { useState } from 'react';
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Segmented, Stepper, TextButton } from '../components';
import { StartDate } from '../StartDate';
import { HELP_TOPICS, helpLink } from '../help';
import { decimal, t } from '../i18n';
import { AdviceItem, careAdvice, needsAttention } from '../plants/advice';
import {
  assessReadings,
  fertiliserHint,
  hasFertiliserTable,
  Level,
  phaseLabel,
  progressImage,
  stageAt,
  weeksSince,
} from '../plants/plans';
import { PLANT_IMAGE } from '../plants/images';
import { Plans } from '../plants/usePlans';
import {
  availableReadings,
  deviceClockSeconds,
  isLightOnAt,
  isSnoozedAt,
  lightEndMinuteOfDay,
  LightSchedule,
  MINUTES_PER_DAY,
  REFERENCE_SOLUTION_EC,
  SensorBar,
  sensorBarOf,
  SNOOZE_SECONDS,
  waterDistanceMm,
} from '../protocol';
import { Theme, useTheme } from '../theme';
import { Calibration, Garden } from '../useGarden';

type Props = {
  garden: Garden;
  plans: Plans;
  error: string | null;
  calibration: Calibration;
  nutrientCalibration: Calibration;
  onCalibrate: () => void;
  onCalibrateNutrient: () => void;
  onSaveSensorBar: (bar: SensorBar) => Promise<boolean>;
  onSaveLight: (light: LightSchedule) => Promise<void>;
  onChoosePlan: (bedIndex: number) => void;
  onStartBed: (bedIndex: number) => void;
  onChangeStart: (bedIndex: number, startedAt: Date) => void;
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
  calibration,
  nutrientCalibration,
  onCalibrate,
  onCalibrateNutrient,
  onSaveSensorBar,
  onSaveLight,
  onChoosePlan,
  onStartBed,
  onChangeStart,
  onEmptyBed,
  onDisconnect,
}: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState(garden.light);
  const [saving, setSaving] = useState(false);
  const [sensorBarChanged, setSensorBarChanged] = useState(false);

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
    return { plan, week, stage: stageAt(plan, week), startedAt: bed.startedAt };
  });
  const growing = beds.filter((bed) => bed !== null);
  // A nutrient value of 0 means the probe is dry or missing; then the
  // fertiliser advice falls back to the amounts per phase.
  const reading = garden.status;
  const readings = reading
    ? availableReadings(reading, garden.sensorConfig)
    : { air: false, water: false };
  const sensorBarMissing =
    reading !== null &&
    garden.sensorConfig.airTemperatureHumidity > 0 &&
    garden.sensorConfig.waterLevel > 0 &&
    !readings.air &&
    !readings.water;
  const ecReading = reading ? (reading.userEc > 0 ? reading.userEc : reading.factoryEc) : 0;
  const measuredEc = garden.sensorConfig.tds > 0 && ecReading > 0 ? ecReading : null;
  const advice = careAdvice({
    beds: growing,
    waterLevelPercent: reading && readings.water ? reading.waterLevelPercent : null,
    ec: measuredEc,
    light: garden.light,
  });
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

  const sensorBar = sensorBarOf(garden.sensorConfig);

  const confirmSensorBar = (bar: SensorBar) => {
    if (bar === sensorBar) {
      return;
    }
    Alert.alert(t('sensor_bar_change', { bar }), t('sensor_bar_change_message'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('sensor_bar_confirm'),
        style: 'destructive',
        onPress: async () => setSensorBarChanged(await onSaveSensorBar(bar)),
      },
    ]);
  };

  const confirmNutrientCalibration = () =>
    Alert.alert(
      t('calibrate_nutrient'),
      t('calibrate_nutrient_message', { ec: REFERENCE_SOLUTION_EC }),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('calibrate_nutrient_confirm'), onPress: onCalibrateNutrient },
      ],
    );

  const confirmCalibration = () =>
    Alert.alert(
      t('calibrate'),
      t('calibrate_message'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('calibrate_confirm'), onPress: onCalibrate },
      ],
    );

  const confirmRestart = (bedIndex: number) =>
    Alert.alert(
      t('bed', { number: bedIndex + 1 }),
      t('restart_message'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('empty_bed'), style: 'destructive', onPress: () => onEmptyBed(bedIndex) },
        { text: t('restart'), onPress: () => onStartBed(bedIndex) },
      ],
    );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>{garden.name}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {t(`series_${garden.series}`)} · Firmware {garden.firmware}
          </Text>
        </View>
        <TextButton theme={theme} label={t('disconnect')} onPress={onDisconnect} />
      </View>

      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

      {sensorBarMissing ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('sensor_bar_missing')}</Text>
          <Text style={[styles.note, { color: theme.muted }]}>{t('sensor_bar_missing_note')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.tiles}>
            <Tile
              theme={theme}
              label={t('tile_water')}
              value={status && readings.water ? `${Math.round(status.waterLevelPercent)} %` : '–'}
              level={readings.water ? assessment?.water : undefined}
            />
            <Tile
              theme={theme}
              label={t('tile_temperature')}
              value={status && readings.air ? `${decimal(status.airTemperatureCelsius, 1)} °C` : '–'}
              level={readings.air ? assessment?.temperature : undefined}
            />
            <Tile
              theme={theme}
              label={t('tile_humidity')}
              value={status && readings.air ? `${Math.round(status.humidityPercent)} %` : '–'}
              level={readings.air ? assessment?.humidity : undefined}
            />
          </View>
          {status && garden.sensorConfig.airTemperatureHumidity > 0 && !readings.air ? (
            <Text style={[styles.note, { color: theme.muted }]}>{t('sensor_air_missing')}</Text>
          ) : null}
        </>
      )}

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{t('advice_title')}</Text>
        {growing.length === 0 ? (
          <Text style={[styles.note, { color: theme.muted }]}>{t('advice_no_beds')}</Text>
        ) : (
          <>
            {needsAttention(advice) ? null : (
              <Text style={[styles.adviceText, { color: theme.text }]}>{t('advice_nothing')}</Text>
            )}
            {advice.map((item, index) => (
              <AdviceRow key={index} theme={theme} item={item} />
            ))}
          </>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('light_title')}</Text>
          <Text style={[styles.badge, { color: theme.accent, backgroundColor: theme.accentSoft }]}>
            {t(snoozed ? 'light_paused' : lightOn ? 'light_on' : 'light_off')}
          </Text>
        </View>

        <Stepper
          theme={theme}
          label={t('sunrise')}
          value={clock(startMinuteOfDay)}
          onDecrease={() => shiftStart(-START_STEP_MINUTES)}
          onIncrease={() => shiftStart(START_STEP_MINUTES)}
        />
        <Stepper
          theme={theme}
          label={t('duration')}
          value={durationLabel(draft.durationMinutes)}
          onDecrease={() => shiftDuration(-DURATION_STEP_MINUTES)}
          onIncrease={() => shiftDuration(DURATION_STEP_MINUTES)}
        />
        <Stepper
          theme={theme}
          label={t('brightness')}
          value={`${intensityPercent(draft)} %`}
          onDecrease={() => shiftIntensity(-INTENSITY_STEP_PERCENT)}
          onIncrease={() => shiftIntensity(INTENSITY_STEP_PERCENT)}
        />

        <Text style={[styles.note, { color: theme.muted }]}>
          {t('sunset', { time: clock(lightEndMinuteOfDay(draft)) })}
        </Text>

        <PrimaryButton
          theme={theme}
          label={t(saving ? 'saving' : 'save')}
          disabled={!dirty || saving}
          onPress={save}
        />
        <View style={styles.centered}>
          <TextButton
            theme={theme}
            label={t(snoozed ? 'snooze_end' : 'snooze_start')}
            onPress={toggleSnooze}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{t('beds_title')}</Text>
        {beds.map((bed, index) =>
          bed === null ? (
            <View key={index} style={styles.bed}>
              <View style={[styles.bedImage, styles.bedEmpty, { borderColor: theme.border }]} />
              <View style={styles.bedText}>
                <Text style={[styles.bedTitle, { color: theme.text }]}>
                  {t('bed', { number: index + 1 })}
                </Text>
                <Text style={[styles.note, { color: theme.muted }]}>{t('not_started')}</Text>
              </View>
              <TextButton theme={theme} label={t('start')} onPress={() => onStartBed(index)} />
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
                  {t('bed_with_plan', { number: index + 1, plan: bed.plan.name })}
                </Text>
                <Text style={[styles.note, { color: theme.muted }]}>
                  {t('week_and_phase', { week: bed.week + 1, phase: phaseLabel(bed.stage.phase) })}
                </Text>
                {measuredEc === null ? (
                  <Text style={[styles.note, { color: theme.muted }]}>
                    {fertiliserHint(bed.stage)}
                    {hasFertiliserTable(garden.series) ? '' : ` ${t('fertiliser_estimate')}`}
                  </Text>
                ) : null}
                <StartDate
                  theme={theme}
                  value={bed.startedAt}
                  onChange={(date) => onChangeStart(index, date)}
                />
                <View style={styles.bedActions}>
                  <TextButton
                    theme={theme}
                    label={t('change_plan')}
                    onPress={() => onChoosePlan(index)}
                  />
                  <TextButton
                    theme={theme}
                    label={t('restart')}
                    onPress={() => confirmRestart(index)}
                  />
                </View>
              </View>
            </View>
          ),
        )}
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{t('sensor_title')}</Text>

        <Text style={[styles.bedTitle, { color: theme.text }]}>{t('sensor_bar')}</Text>
        <Segmented
          theme={theme}
          options={SENSOR_BAR_OPTIONS}
          selected={sensorBar === 'v1' || sensorBar === 'v2' ? sensorBar : null}
          onSelect={confirmSensorBar}
        />
        {sensorBar === 'v1' || sensorBar === 'v2' ? null : (
          <Text style={[styles.note, { color: theme.muted }]}>
            {t(sensorBar === 'none' ? 'sensor_bar_none' : 'sensor_bar_other')}
          </Text>
        )}
        {sensorBarMissing ? (
          <Text style={[styles.note, { color: theme.muted }]}>{t('sensor_bar_missing')}.</Text>
        ) : null}
        {sensorBarChanged ? (
          <Text style={[styles.note, { color: theme.text }]}>{t('sensor_bar_changed')}</Text>
        ) : null}

        {garden.sensorConfig.tds > 0 ? (
          <>
            {status ? (
              <Text style={[styles.note, { color: theme.muted }]}>
                {measuredEc !== null
                  ? t('ec_value', { value: Math.round(measuredEc) })
                  : t('ec_missing')}
              </Text>
            ) : null}
            {nutrientCalibration === 'idle' ? null : (
              <Text
                style={[
                  styles.note,
                  { color: nutrientCalibration === 'failed' ? theme.danger : theme.text },
                ]}
              >
                {t(`nutrient_calibration_${nutrientCalibration}`)}
              </Text>
            )}
            <View style={styles.centered}>
              <TextButton
                theme={theme}
                label={t('calibrate_nutrient')}
                onPress={confirmNutrientCalibration}
              />
            </View>
          </>
        ) : null}

        {garden.sensorConfig.waterLevel > 0 && (!status || readings.water) ? (
          <>
            <Text style={[styles.note, { color: theme.muted }]}>
              {status
                ? t('sensor_distance', {
                    distance: decimal(waterDistanceMm(status.waterLevelPercent) / 10, 1),
                    full: decimal(waterDistanceMm(100) / 10, 1),
                  })
                : t('sensor_no_reading')}
            </Text>
            {calibration === 'idle' ? null : (
              <Text
                style={[styles.note, { color: calibration === 'failed' ? theme.danger : theme.text }]}
              >
                {t(`calibration_${calibration}`)}
              </Text>
            )}
            <View style={styles.centered}>
              <TextButton theme={theme} label={t('calibrate')} onPress={confirmCalibration} />
            </View>
          </>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{t('help_title')}</Text>
        <Text style={[styles.note, { color: theme.muted }]}>{t('help_note')}</Text>
        {HELP_TOPICS.map((topic) => (
          <View key={topic} style={styles.helpLink}>
            <TextButton
              theme={theme}
              label={t(`help_${topic}`)}
              onPress={() => Linking.openURL(helpLink(garden.series, topic))}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const SENSOR_BAR_OPTIONS: { value: SensorBar; label: string }[] = [
  { value: 'v1', label: 'v1' },
  { value: 'v2', label: 'v2' },
];

function AdviceRow({ theme, item }: { theme: Theme; item: AdviceItem }) {
  const color =
    item.urgency === 'now' ? theme.danger : item.urgency === 'soon' ? theme.warning : theme.muted;
  return (
    <View style={styles.advice}>
      <View style={[styles.dot, styles.adviceDot, { backgroundColor: color }]} />
      <Text
        style={[styles.adviceText, { color: item.urgency === 'info' ? theme.muted : theme.text }]}
      >
        {item.text}
      </Text>
    </View>
  );
}

function levelColor(theme: Theme, level: Level): string {
  return level === 'green' ? theme.accent : level === 'yellow' ? theme.warning : theme.danger;
}

function Tile(props: { theme: Theme; label: string; value: string; level?: Level }) {
  const { theme, level } = props;
  return (
    <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.tileValue, { color: theme.text }]}>{props.value}</Text>
      <Text style={[styles.tileLabel, { color: theme.muted }]}>{props.label}</Text>
      {level ? (
        <View style={styles.level}>
          <View style={[styles.dot, { backgroundColor: levelColor(theme, level) }]} />
          <Text style={[styles.tileLabel, { color: levelColor(theme, level) }]}>{t(`level_${level}`)}</Text>
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
  bedActions: { flexDirection: 'row', gap: 24, marginTop: 4 },
  advice: { flexDirection: 'row', gap: 10 },
  adviceDot: { marginTop: 7 },
  adviceText: { flex: 1, fontSize: 16, lineHeight: 22 },
  centered: { alignItems: 'center' },
  helpLink: { alignItems: 'flex-start' },
  bedTitle: { fontSize: 16, fontWeight: '600' },
});
