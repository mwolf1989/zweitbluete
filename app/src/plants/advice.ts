// What the gardener should do right now, derived from sensor readings, the
// light schedule and the plans of the growing beds.
import { decimal, litres, t } from '../i18n';
import { LightSchedule } from '../protocol';
import { assess, Model, Plan, PlanStage, waterRanges } from './plans';

export type Urgency = 'info' | 'soon' | 'now';

export type AdviceItem = {
  topic: 'water' | 'light';
  urgency: Urgency;
  text: string;
};

export type GrowingBed = { plan: Plan; week: number; stage: PlanStage };

// Nominal tank sizes from the product listings. The level sensor reports a
// percentage, so litres are an estimate and worded as such.
const TANK_LITRES: Record<Model, number> = { S: 3.5, E: 7, M: 7, X: 7 };

const LOW_INTENSITY = 0.3 * 255;

function roundedLitres(value: number): string {
  return litres(Math.max(0.5, Math.round(value * 2) / 2));
}

function waterAdvice(bed: GrowingBed, levelPercent: number, model: Model): AdviceItem | null {
  const ranges = waterRanges(bed.plan, bed.week);
  const level = assess(levelPercent, ranges);
  if (level === 'green') {
    return null;
  }
  const urgency: Urgency = level === 'red' ? 'now' : 'soon';
  const action = levelPercent < ranges.target ? 'add' : 'remove';
  const amount = roundedLitres((Math.abs(ranges.target - levelPercent) / 100) * TANK_LITRES[model]);
  return { topic: 'water', urgency, text: t(`water_${action}_${urgency}`, { amount }) };
}

export function careAdvice(input: {
  beds: GrowingBed[];
  waterLevelPercent: number | null;
  light: LightSchedule;
  model: Model;
}): AdviceItem[] {
  const { beds, waterLevelPercent, light, model } = input;
  if (beds.length === 0) {
    return [];
  }
  const items: AdviceItem[] = [];
  const first = beds[0];

  if (waterLevelPercent !== null) {
    const water = waterAdvice(first, waterLevelPercent, model);
    if (water) {
      items.push(water);
    }
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
