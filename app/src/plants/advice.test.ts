import assert from 'node:assert/strict';
import { test } from 'node:test';

import { setLanguage } from '../i18n';

import { decodeLight } from '../protocol';
import {
  careAdvice,
  fertiliserMissingSpoons,
  GrowingBed,
  needsAttention,
  waterMissingLitres,
} from './advice';
import { builtInKey, builtInPlans, stageAt } from './plans';

setLanguage('de');

const hex = (text: string) => Uint8Array.from(text.split(' ').map((byte) => parseInt(byte, 16)));
const light = decodeLight(hex('05 00 03 48 ff 00 00 00 00')); // 14 h, full brightness

function bed(programId: number, week: number): GrowingBed {
  const plan = builtInPlans('E').find((candidate) => candidate.key === builtInKey(programId))!;
  return { plan, week, stage: stageAt(plan, week) };
}

const advise = (beds: GrowingBed[], waterLevelPercent: number | null, ec: number | null = null) =>
  careAdvice({ beds, waterLevelPercent, ec, light });

test('no growing beds, no advice', () => {
  assert.deepEqual(advise([], 30), []);
});

test('water formula of the original app', () => {
  // (target - level) x 7.8 litres, with the level counted as at least 10 %.
  assert.ok(Math.abs(waterMissingLitres(30, 80) - 3.9) < 1e-9);
  assert.ok(Math.abs(waterMissingLitres(110, 80) + 2.34) < 1e-9);
  assert.ok(Math.abs(waterMissingLitres(2, 80) - 5.46) < 1e-9);
});

test('fertiliser formula of the original app', () => {
  // (target - ec + 20) x level / divisor, divisor by fill level.
  const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-4);
  close(fertiliserMissingSpoons(1000, 1400, 95), (420 * 0.95) / 255);
  close(fertiliserMissingSpoons(1000, 1400, 90), (420 * 0.9) / 255);
  close(fertiliserMissingSpoons(1000, 1400, 85), (420 * 0.85) / 320);
  close(fertiliserMissingSpoons(1000, 1400, 70), (420 * 0.7) / 435);
  close(fertiliserMissingSpoons(1000, 1400, 50), (420 * 0.5) / 665);
  close(fertiliserMissingSpoons(1000, 1400, 120), 420 / 255);
  assert.ok(fertiliserMissingSpoons(1500, 1000, 90) < 0);
});

test('the captured device state asks for water urgently', () => {
  // Bed in harvest far past its plan, water at 30 %: target 80 %, red below 35 %.
  const items = advise([bed(7, 98)], 30);
  assert.deepEqual(items[0], {
    topic: 'water',
    urgency: 'now',
    text: 'Gieße möglichst bald etwa 4 Liter Wasser nach.',
  });
  assert.equal(needsAttention(items), true);
});

test('a level in the yellow band is not urgent', () => {
  const [water] = advise([bed(7, 98)], 50);
  assert.equal(water.urgency, 'soon');
  assert.equal(water.text, 'Gieße bald etwa 2,5 Liter Wasser nach.');
});

test('too much water asks to remove some', () => {
  const [water] = advise([bed(7, 98)], 110);
  assert.equal(water.text, 'Entnimm möglichst bald etwa 2,5 Liter Wasser.');
});

test('a good level leaves only the phase hint', () => {
  const items = advise([bed(7, 98)], 80);
  assert.deepEqual(items, [
    { topic: 'water', urgency: 'info', text: 'Lass unter den Töpfen etwa 2 cm Luft.' },
  ]);
  assert.equal(needsAttention(items), false);
});

test('without a level sensor there is no litre advice', () => {
  const items = advise([bed(5, 0)], null);
  assert.equal(items[0].urgency, 'info');
  assert.match(items[0].text, /Anzuchttöpfe feucht/);
});

test('fertiliser advice follows the nutrient reading', () => {
  // Week 3 of "Salate und Kräuter": target 1000, green 850-1100, yellow 700-850.
  const fertiliser = (ec: number) =>
    advise([bed(7, 3)], 90, ec).find((item) => item.topic === 'fertiliser');

  assert.equal(fertiliser(900), undefined);
  assert.deepEqual(fertiliser(800), {
    topic: 'fertiliser',
    urgency: 'soon',
    text: 'Dünge bald mit etwa 0,8 Löffel.',
  });
  assert.deepEqual(fertiliser(500), {
    topic: 'fertiliser',
    urgency: 'now',
    text: 'Dünge möglichst bald mit etwa 1,8 Löffel.',
  });
  assert.equal(
    fertiliser(1500)?.text,
    'Die Nährlösung ist zu stark. Ersetze einige Liter durch Leitungswasser.',
  );
});

test('with two beds the lower nutrient target counts', () => {
  // Tomatoes in week 7 aim for 1600, lettuce and herbs in week 3 for 1000.
  const items = advise([bed(5, 7), bed(7, 3)], 90, 900);
  assert.equal(items.find((item) => item.topic === 'fertiliser'), undefined);
});

test('water comes before fertiliser when both are due', () => {
  const items = advise([bed(7, 3)], 60, 800);
  assert.deepEqual(
    items.slice(0, 3).map((item) => item.text),
    [
      'Gieße möglichst bald etwa 2,5 Liter Wasser nach.',
      'Dünge bald mit etwa 0,3 Löffel.',
      'Kümmere dich zuerst um das Wasser, danach um den Dünger.',
    ],
  );
});

test('light duration is compared with the longest recommendation of all beds', () => {
  // Tomatoes in week 0 want 12 h, herbs in week 3 want 15 h; 14 h are set.
  const lightItem = advise([bed(5, 0), bed(2, 3)], null).find((item) => item.topic === 'light');
  assert.equal(
    lightItem?.text,
    'Für deine Pflanzen sind 15 h Licht pro Tag empfohlen, eingestellt sind 14 h.',
  );
});

test('very low brightness is flagged', () => {
  const dim = { ...light, intensity: 51 }; // 20 %
  const items = careAdvice({ beds: [bed(7, 98)], waterLevelPercent: 80, ec: null, light: dim });
  assert.ok(items.some((item) => item.text.startsWith('Die Helligkeit ist sehr niedrig')));
});

test('advice is available in English', () => {
  setLanguage('en');
  try {
    const items = advise([bed(7, 98)], 30);
    assert.equal(items[0].text, 'Add about 4 litres of water as soon as possible.');
    assert.equal(items[1].text, 'Leave about 2 cm of air below the cups.');
    assert.equal(bed(7, 98).plan.name, 'Lettuce and herbs');

    // 96 % with a target of 80 %: 0.16 x 7.8 l rounds to one litre.
    assert.equal(advise([bed(7, 98)], 96)[0].text, 'Remove about 1 litre of water soon.');
    assert.equal(
      advise([bed(7, 3)], 90, 800).find((item) => item.topic === 'fertiliser')?.text,
      'Add about 0.8 spoons of fertiliser soon.',
    );
  } finally {
    setLanguage('de');
  }
});
