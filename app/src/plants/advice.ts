// What the gardener should do right now, derived from sensor readings, the
// light schedule and the plans of the growing beds.
import { LightSchedule } from '../protocol';
import { assess, Model, Phase, Plan, PlanStage, waterRanges } from './plans';

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

const WATER_BY_PHASE: Record<Phase, string> = {
  keimung: 'Halte die Anzuchttöpfe feucht, bis die Wurzeln ins Wasser reichen.',
  wachstum: 'Die Wurzeln sollen dauerhaft im Wasser hängen, die Töpfe selbst nicht mehr.',
  ernte: 'Lass unter den Töpfen etwa 2 cm Luft.',
};

function litres(value: number): string {
  const rounded = Math.max(0.5, Math.round(value * 2) / 2);
  return `${String(rounded).replace('.', ',')} Liter`;
}

function waterAdvice(bed: GrowingBed, levelPercent: number, model: Model): AdviceItem | null {
  const ranges = waterRanges(bed.plan, bed.week);
  const level = assess(levelPercent, ranges);
  if (level === 'green') {
    return null;
  }
  const urgency: Urgency = level === 'red' ? 'now' : 'soon';
  const when = level === 'red' ? 'möglichst bald' : 'bald';
  const amount = litres((Math.abs(ranges.target - levelPercent) / 100) * TANK_LITRES[model]);
  const text =
    levelPercent < ranges.target
      ? `Gieße ${when} etwa ${amount} Wasser nach.`
      : `Entnimm ${when} etwa ${amount} Wasser.`;
  return { topic: 'water', urgency, text };
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
  items.push({ topic: 'water', urgency: 'info', text: WATER_BY_PHASE[first.stage.phase] });

  const recommendedHours = Math.max(...beds.map((bed) => bed.stage.lightHours));
  const setHours = light.durationMinutes / 60;
  if (Math.abs(setHours - recommendedHours) >= 1) {
    const set = String(Math.round(setHours * 2) / 2).replace('.', ',');
    items.push({
      topic: 'light',
      urgency: 'soon',
      text: `Für deine Pflanzen sind ${recommendedHours} h Licht pro Tag empfohlen, eingestellt sind ${set} h.`,
    });
  }
  if (light.intensity < LOW_INTENSITY) {
    items.push({
      topic: 'light',
      urgency: 'soon',
      text: 'Die Helligkeit ist sehr niedrig eingestellt. Das kann das Wachstum bremsen.',
    });
  }
  return items;
}

export function needsAttention(items: AdviceItem[]): boolean {
  return items.some((item) => item.urgency !== 'info');
}
