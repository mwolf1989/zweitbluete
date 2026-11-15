import assert from 'node:assert/strict';
import { test } from 'node:test';

import { setLanguage } from '../i18n';

import { decodeLight } from '../protocol';
import { careAdvice, GrowingBed, needsAttention } from './advice';
import { builtInKey, builtInPlans, stageAt } from './plans';

setLanguage('de');

const hex = (text: string) => Uint8Array.from(text.split(' ').map((byte) => parseInt(byte, 16)));
const light = decodeLight(hex('05 00 03 48 ff 00 00 00 00')); // 14 h, full brightness

function bed(programId: number, week: number): GrowingBed {
  const plan = builtInPlans('E').find((candidate) => candidate.key === builtInKey(programId))!;
  return { plan, week, stage: stageAt(plan, week) };
}

test('no growing beds, no advice', () => {
  assert.deepEqual(careAdvice({ beds: [], waterLevelPercent: 30, light, model: 'E' }), []);
});

test('the captured device state asks for water urgently', () => {
  // Bed in harvest far past its plan, water at 30 %: target 80 %, red below 35 %.
  const items = careAdvice({ beds: [bed(7, 98)], waterLevelPercent: 30, light, model: 'E' });
  assert.deepEqual(items[0], {
    topic: 'water',
    urgency: 'now',
    text: 'Gieße möglichst bald etwa 3,5 Liter Wasser nach.',
  });
  assert.equal(needsAttention(items), true);
});

test('the small tank needs half the water', () => {
  const [water] = careAdvice({ beds: [bed(7, 98)], waterLevelPercent: 30, light, model: 'S' });
  assert.equal(water.text, 'Gieße möglichst bald etwa 2 Liter Wasser nach.');
});

test('a level in the yellow band is not urgent', () => {
  const [water] = careAdvice({ beds: [bed(7, 98)], waterLevelPercent: 50, light, model: 'E' });
  assert.equal(water.urgency, 'soon');
  assert.equal(water.text, 'Gieße bald etwa 2 Liter Wasser nach.');
});

test('too much water asks to remove some', () => {
  const [water] = careAdvice({ beds: [bed(7, 98)], waterLevelPercent: 110, light, model: 'E' });
  assert.equal(water.text, 'Entnimm möglichst bald etwa 2 Liter Wasser.');
});

test('a good level leaves only the phase hint', () => {
  const items = careAdvice({ beds: [bed(7, 98)], waterLevelPercent: 80, light, model: 'E' });
  assert.deepEqual(items, [
    { topic: 'water', urgency: 'info', text: 'Lass unter den Töpfen etwa 2 cm Luft.' },
  ]);
  assert.equal(needsAttention(items), false);
});

test('without a level sensor there is no litre advice', () => {
  const items = careAdvice({ beds: [bed(5, 0)], waterLevelPercent: null, light, model: 'S' });
  assert.equal(items[0].urgency, 'info');
  assert.match(items[0].text, /Anzuchttöpfe feucht/);
});

test('light duration is compared with the longest recommendation of all beds', () => {
  // Tomatoes in week 0 want 12 h, herbs in week 3 want 15 h; 14 h are set.
  const items = careAdvice({ beds: [bed(5, 0), bed(2, 3)], waterLevelPercent: null, light, model: 'E' });
  const lightItem = items.find((item) => item.topic === 'light');
  assert.equal(
    lightItem?.text,
    'Für deine Pflanzen sind 15 h Licht pro Tag empfohlen, eingestellt sind 14 h.',
  );
});

test('very low brightness is flagged', () => {
  const dim = { ...light, intensity: 51 }; // 20 %
  const items = careAdvice({ beds: [bed(7, 98)], waterLevelPercent: 80, light: dim, model: 'E' });
  assert.ok(items.some((item) => item.text.startsWith('Die Helligkeit ist sehr niedrig')));
});

test('advice is available in English', () => {
  setLanguage('en');
  try {
    const items = careAdvice({ beds: [bed(7, 98)], waterLevelPercent: 30, light, model: 'E' });
    assert.equal(items[0].text, 'Add about 3.5 litres of water as soon as possible.');
    assert.equal(items[1].text, 'Leave about 2 cm of air below the cups.');
    assert.equal(bed(7, 98).plan.name, 'Lettuce and herbs');

    // Small tank, level in the yellow band: 25 % of 3.5 l rounds to one litre.
    const single = careAdvice({ beds: [bed(7, 98)], waterLevelPercent: 55, light, model: 'S' });
    assert.equal(single[0].text, 'Add about 1 litre of water soon.');
  } finally {
    setLanguage('de');
  }
});
