// Plant programs. Built-in data is extracted from the original app's bundled
// databases by ../../../tools/extract_plantdb.py into programs.json.
import { spoons, t } from '../i18n';
import { Series } from '../protocol';
import database from './programs.json';

export type Phase = 'keimung' | 'wachstum' | 'ernte';

export const PHASES: Phase[] = ['keimung', 'wachstum', 'ernte'];

export function phaseLabel(phase: Phase): string {
  return t(`phase_${phase}`);
}

// The original app shipped two tables of fertiliser amounts per phase, one for
// the S series and one for the E series. The standard series has no such
// table because it doses by its nutrient sensor. For the moments that sensor
// gives no value, the E amounts stand in; both have the large tank.
export function hasFertiliserTable(series: Series): boolean {
  return series !== 'standard';
}

export type PlanStage = {
  weeks: number;
  phase: Phase;
  lightHours: number;
  spoonsPerWeek: number;
  spoonsPerLitreRefill: number;
};

export type Plan = {
  key: string;
  name: string;
  builtIn: boolean;
  stages: PlanStage[];
};

export type Level = 'green' | 'yellow' | 'red';

type Span = number[];
export type Ranges = { green: Span; yellow: Span[]; red: Span[] };

type SimpleRow = {
  weeks: number[];
  phase: string;
  lightHours: number;
  spoonsPerWeek: number;
  spoonsPerLitreRefill: number;
};

type SensorRow = {
  weeks: number[];
  ec: Ranges & { target: number };
  waterPercent: Ranges & { target: number };
  temperatureCelsius: Ranges;
  humidityPercent: Ranges;
};

const GENERAL_PROGRAM_ID = 255;

export function builtInKey(programId: number): string {
  return `builtin:${programId}`;
}

// The device stores one program id per bed. Custom plans are stored as the
// general program; which custom plan it is lives on the phone.
export function programIdOf(plan: Plan): number {
  return plan.builtIn ? Number(plan.key.slice('builtin:'.length)) : GENERAL_PROGRAM_ID;
}

export function builtInPlans(series: Series): Plan[] {
  const rows: Record<string, SimpleRow[]> = series === 'S' ? database.seriesS : database.seriesE;
  return database.programs.map((program) => ({
    key: builtInKey(program.id),
    name: t(`program_${program.id}` as 'program_255'),
    builtIn: true,
    stages: rows[String(program.id)].map((row) => ({
      weeks: row.weeks.length,
      phase: row.phase as Phase,
      lightHours: row.lightHours,
      spoonsPerWeek: row.spoonsPerWeek,
      spoonsPerLitreRefill: row.spoonsPerLitreRefill,
    })),
  }));
}

export function totalWeeks(plan: Plan): number {
  return plan.stages.reduce((sum, stage) => sum + stage.weeks, 0);
}

// Weeks count from 0. Past the end of the plan the last stage keeps applying,
// which is what a bed left growing in harvest needs.
export function stageAt(plan: Plan, week: number): PlanStage {
  let end = 0;
  for (const stage of plan.stages) {
    end += stage.weeks;
    if (week < end) {
      return stage;
    }
  }
  return plan.stages[plan.stages.length - 1];
}

export function weeksSince(start: Date, now: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / msPerWeek));
}

function sensorRow(plan: Plan, week: number): SensorRow {
  const rows: Record<string, SensorRow[]> = database.sensor;
  const programId = plan.builtIn ? plan.key.slice('builtin:'.length) : String(GENERAL_PROGRAM_ID);
  const programRows = rows[programId] ?? rows[String(GENERAL_PROGRAM_ID)];
  return programRows.find((row) => row.weeks.includes(week)) ?? programRows[programRows.length - 1];
}

export function waterRanges(plan: Plan, week: number): Ranges & { target: number } {
  return sensorRow(plan, week).waterPercent;
}

export function ecRanges(plan: Plan, week: number): Ranges & { target: number } {
  return sensorRow(plan, week).ec;
}

function within(value: number, [low, high]: Span): boolean {
  return value >= low && value <= high;
}

export function assess(value: number, ranges: Ranges): Level {
  if (within(value, ranges.green)) {
    return 'green';
  }
  if (ranges.yellow.some((range) => within(value, range))) {
    return 'yellow';
  }
  return 'red';
}

export type Assessment = { water: Level; temperature: Level; humidity: Level };

export function assessReadings(
  plan: Plan,
  week: number,
  readings: { waterLevelPercent: number; airTemperatureCelsius: number; humidityPercent: number },
): Assessment {
  const row = sensorRow(plan, week);
  return {
    water: assess(readings.waterLevelPercent, row.waterPercent),
    temperature: assess(readings.airTemperatureCelsius, row.temperatureCelsius),
    humidity: assess(readings.humidityPercent, row.humidityPercent),
  };
}

export type ImageKey =
  | 'progress-0'
  | 'progress-1'
  | 'progress-2'
  | 'progress-3'
  | 'progress-4'
  | 'progress-tomato-unripe'
  | 'progress-tomato-ripe'
  | 'progress-chili-unripe'
  | 'progress-chili-ripe'
  | 'program-basil'
  | 'program-herbs'
  | 'program-lettuce'
  | 'program-vegetables'
  | 'program-tomatoes'
  | 'program-chilis'
  | 'program-lettuce-herbs'
  | 'program-general';

const PROGRAM_IMAGE: Record<number, ImageKey> = {
  1: 'program-basil',
  2: 'program-herbs',
  3: 'program-lettuce',
  4: 'program-vegetables',
  5: 'program-tomatoes',
  6: 'program-chilis',
  7: 'program-lettuce-herbs',
  255: 'program-general',
};

export function programImage(plan: Plan): ImageKey {
  return PROGRAM_IMAGE[programIdOf(plan)] ?? 'program-general';
}

// Which growth picture a bed shows in a given week, as in the original app.
// Custom plans follow the general program's sequence.
export function progressImage(plan: Plan, week: number): ImageKey {
  const byWeek: Record<string, string[]> = database.progressImages;
  const images = byWeek[String(programIdOf(plan))] ?? byWeek[String(GENERAL_PROGRAM_ID)];
  return images[Math.min(week, images.length - 1)] as ImageKey;
}

export function fertiliserHint(stage: PlanStage): string {
  if (stage.spoonsPerWeek > 0) {
    return t('fertiliser_this_week', { amount: spoons(stage.spoonsPerWeek) });
  }
  if (stage.spoonsPerLitreRefill > 0) {
    return t('fertiliser_per_refill', { amount: spoons(stage.spoonsPerLitreRefill) });
  }
  return t('fertiliser_none');
}

export function newCustomPlan(id: string): Plan {
  const template = builtInPlans('E').find((plan) => plan.key === builtInKey(GENERAL_PROGRAM_ID))!;
  return { key: `custom:${id}`, name: t('default_plan_name'), builtIn: false, stages: template.stages.map((stage) => ({ ...stage })) };
}

export const STAGE_LIMITS = {
  weeks: { min: 1, max: 52, step: 1 },
  lightHours: { min: 0, max: 23, step: 1 },
  spoonsPerWeek: { min: 0, max: 10, step: 0.5 },
  spoonsPerLitreRefill: { min: 0, max: 3, step: 0.25 },
} as const;
