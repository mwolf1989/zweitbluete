// Plant programs. Built-in data is extracted from the original app's bundled
// databases by ../../../tools/extract_plantdb.py into programs.json.
import database from './programs.json';

export type Phase = 'keimung' | 'wachstum' | 'ernte';

export const PHASES: Phase[] = ['keimung', 'wachstum', 'ernte'];

export const PHASE_LABEL: Record<Phase, string> = {
  keimung: 'Keimung',
  wachstum: 'Wachstum',
  ernte: 'Ernte',
};

export type Model = 'S' | 'E' | 'M' | 'X';

export const MODELS: { model: Model; name: string; description: string }[] = [
  { model: 'S', name: 'smartGarten S', description: '3,5 l Wassertank, 3 Pflanzen' },
  { model: 'E', name: 'smartGarten E', description: '7 l Wassertank, 6 Pflanzen' },
  { model: 'M', name: 'smartGarten M', description: '7 l Wassertank, 6 Pflanzen, Nährstoffsensor' },
  { model: 'X', name: 'smartGarten X', description: '7 l Wassertank, 6 Pflanzen, höhenverstellbar' },
];

// The original app shipped two tables of fertiliser amounts, one for the small
// tank (S) and one for the 7 l tank (E). M and X relied on their nutrient
// sensor instead; until that sensor is decoded they use the 7 l amounts.
type Series = 'S' | 'E';

function seriesOf(model: Model): Series {
  return model === 'S' ? 'S' : 'E';
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
type Ranges = { green: Span; yellow: Span[]; red: Span[] };

type SimpleRow = {
  weeks: number[];
  phase: string;
  lightHours: number;
  spoonsPerWeek: number;
  spoonsPerLitreRefill: number;
};

type SensorRow = {
  weeks: number[];
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

export function builtInPlans(model: Model): Plan[] {
  const rows: Record<string, SimpleRow[]> =
    seriesOf(model) === 'S' ? database.seriesS : database.seriesE;
  return database.programs.map((program) => ({
    key: builtInKey(program.id),
    name: program.name,
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
  const amount = (value: number) => String(value).replace('.', ',');
  if (stage.spoonsPerWeek > 0) {
    return `Diese Woche ${amount(stage.spoonsPerWeek)} Löffel Dünger`;
  }
  if (stage.spoonsPerLitreRefill > 0) {
    return `Beim Nachgießen ${amount(stage.spoonsPerLitreRefill)} Löffel Dünger pro Liter`;
  }
  return 'Kein Dünger nötig';
}

export function newCustomPlan(id: string): Plan {
  const template = builtInPlans('E').find((plan) => plan.key === builtInKey(GENERAL_PROGRAM_ID))!;
  return { key: `custom:${id}`, name: 'Mein Plan', builtIn: false, stages: template.stages.map((stage) => ({ ...stage })) };
}

export const STAGE_LIMITS = {
  weeks: { min: 1, max: 52, step: 1 },
  lightHours: { min: 0, max: 23, step: 1 },
  spoonsPerWeek: { min: 0, max: 10, step: 0.5 },
  spoonsPerLitreRefill: { min: 0, max: 3, step: 0.25 },
} as const;
