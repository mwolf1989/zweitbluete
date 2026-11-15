// What the gardener should do right now, derived from sensor readings, the
// light schedule and the plans of the growing beds. The water and fertiliser
// formulas are the original app's, read from its decompiled code.
import { decimal, litres, spoons, t } from '../i18n';
import { LightSchedule } from '../protocol';
import { assess, ecRanges, Plan, PlanStage, waterRanges } from './plans';

export type Urgency = 'info' | 'soon' | 'now';

export type AdviceItem = {
  topic: 'water' | 'fertiliser' | 'light';
  urgency: Urgency;
  text: string;
};

export type GrowingBed = { plan: Plan; week: number; stage: PlanStage };

const TANK_LITRES = 7.8;
const LOWEST_COUNTED_LEVEL = 0.1;
const LOW_INTENSITY = 0.3 * 255;

// Litres to add (positive) or remove (negative) to reach the target level.
export function waterMissingLitres(levelPercent: number, targetPercent: number): number {
  return (targetPercent / 100 - Math.max(levelPercent / 100, LOWEST_COUNTED_LEVEL)) * TANK_LITRES;
}

// Spoons of fertiliser to add (positive) to reach the target EC; negative
// means the solution is too strong. The divisor depends on how full the tank
// is, in the steps the original app uses.
export function fertiliserMissingSpoons(ec: number, targetEc: number, levelPercent: number): number {
  const level = Math.min(levelPercent / 100, 1);
  const divisor = level >= 0.9 ? 255 : level >= 0.8 ? 320 : level >= 0.6 ? 435 : 665;
  return ((targetEc - ec + 20) * level) / divisor;
}

function waterAdvice(bed: GrowingBed, levelPercent: number): AdviceItem | null {
  const ranges = waterRanges(bed.plan, bed.week);
  const level = assess(levelPercent, ranges);
  if (level === 'green') {
    return null;
  }
  const urgency: Urgency = level === 'red' ? 'now' : 'soon';
  const missing = waterMissingLitres(levelPercent, ranges.target);
  const amount = litres(Math.max(0.5, Math.round(Math.abs(missing) * 2) / 2));
  return {
    topic: 'water',
    urgency,
    text: t(`water_${missing < 0 ? 'remove' : 'add'}_${urgency}`, { amount }),
  };
}

function fertiliserAdvice(beds: GrowingBed[], ec: number, levelPercent: number): AdviceItem | null {
  // With two beds the original app aims for the lower of the two targets.
  const bed = beds.reduce((lowest, candidate) =>
    ecRanges(candidate.plan, candidate.week).target < ecRanges(lowest.plan, lowest.week).target
      ? candidate
      : lowest,
  );
  const ranges = ecRanges(bed.plan, bed.week);
  const level = assess(ec, ranges);
  if (level === 'green') {
    return null;
  }
  const urgency: Urgency = level === 'red' ? 'now' : 'soon';
  const missing = fertiliserMissingSpoons(ec, ranges.target, levelPercent);
  if (missing < 0) {
    return { topic: 'fertiliser', urgency, text: t('fertiliser_too_much') };
  }
  const amount = spoons(Math.round(missing * 10) / 10);
  return { topic: 'fertiliser', urgency, text: t(`fertiliser_add_${urgency}`, { amount }) };
}

export function careAdvice(input: {
  beds: GrowingBed[];
  waterLevelPercent: number | null;
  // Nutrient reading in µS/cm, or null without a sensor or without a value.
  ec: number | null;
  light: LightSchedule;
}): AdviceItem[] {
  const { beds, waterLevelPercent, ec, light } = input;
  if (beds.length === 0) {
    return [];
  }
  const items: AdviceItem[] = [];
  const first = beds[0];

  const water = waterLevelPercent === null ? null : waterAdvice(first, waterLevelPercent);
  const fertiliser =
    ec === null || waterLevelPercent === null ? null : fertiliserAdvice(beds, ec, waterLevelPercent);
  if (water) {
    items.push(water);
  }
  if (fertiliser) {
    items.push(fertiliser);
  }
  if (water && fertiliser) {
    items.push({ topic: 'water', urgency: 'info', text: t('water_before_fertiliser') });
  }
  items.push({ topic: 'water', urgency: 'info', text: t(`water_${first.stage.phase}`) });

  const recommendedHours = Math.max(...beds.map((bed) => bed.stage.lightHours));
  const setHours = light.durationMinutes / 60;
  if (Math.abs(setHours - recommendedHours) >= 1) {
    items.push({
      topic: 'light',
      urgency: 'soon',
      text: t('light_duration_differs', {
        recommended: recommendedHours,
        set: decimal(Math.round(setHours * 2) / 2),
      }),
    });
  }
  if (light.intensity < LOW_INTENSITY) {
    items.push({ topic: 'light', urgency: 'soon', text: t('light_too_dim') });
  }
  return items;
}

export function needsAttention(items: AdviceItem[]): boolean {
  return items.some((item) => item.urgency !== 'info');
}
