import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assess,
  assessReadings,
  builtInKey,
  builtInPlans,
  Model,
  fertiliserHint,
  newCustomPlan,
  programImage,
  progressImage,
  stageAt,
  totalWeeks,
  weeksSince,
} from './plans';

const plan = (model: Model, programId: number) =>
  builtInPlans(model).find((candidate) => candidate.key === builtInKey(programId))!;

test('all eight original programs are present for every model', () => {
  for (const model of ['S', 'E', 'M', 'X'] as const) {
    assert.deepEqual(
      builtInPlans(model).map((entry) => entry.name),
      ['Basilikum', 'Kräuter', 'Salate', 'Gemüse', 'Tomaten', 'Chilis', 'Salate und Kräuter', 'Allgemein'],
    );
  }
});

test('tomatoes follow the original stages', () => {
  const tomatoes = plan('E', 5);
  assert.equal(totalWeeks(tomatoes), 16);
  assert.deepEqual(
    tomatoes.stages.map((stage) => [stage.weeks, stage.phase]),
    [
      [2, 'keimung'],
      [1, 'wachstum'],
      [6, 'wachstum'],
      [6, 'wachstum'],
      [1, 'ernte'],
    ],
  );
  assert.equal(stageAt(tomatoes, 2).spoonsPerWeek, 4);
  assert.equal(plan('S', 5).stages[1].spoonsPerWeek, 2);
  assert.deepEqual(plan('M', 5), tomatoes);
  assert.deepEqual(plan('X', 5), tomatoes);
});

test('duplicate week in the chili source data is counted once', () => {
  // Source row lists weeks "8,9,10,10,11".
  assert.equal(totalWeeks(plan('E', 6)), 17);
});

test('stage lookup clamps to the last stage', () => {
  const herbs = plan('E', 2);
  assert.equal(stageAt(herbs, 0).phase, 'keimung');
  assert.equal(stageAt(herbs, 3).phase, 'wachstum');
  assert.equal(stageAt(herbs, 4).phase, 'ernte');
  assert.equal(stageAt(herbs, 98).phase, 'ernte');
});

test('weeks since start', () => {
  const start = new Date('2024-12-29T13:49:57Z');
  assert.equal(weeksSince(start, new Date('2025-01-05T13:49:56Z')), 0);
  assert.equal(weeksSince(start, new Date('2025-01-05T13:49:57Z')), 1);
  assert.equal(weeksSince(start, new Date('2024-01-01T00:00:00Z')), 0);
});

test('assess picks green, yellow, red', () => {
  const ranges = { green: [18, 35], yellow: [[10, 18]], red: [[0, 10], [35, 45]] };
  assert.equal(assess(22, ranges), 'green');
  assert.equal(assess(16.4, ranges), 'yellow');
  assert.equal(assess(5, ranges), 'red');
  assert.equal(assess(60, ranges), 'red');
});

test('readings captured from the device are assessed against the late stage', () => {
  const result = assessReadings(plan('E', 7), 98, {
    waterLevelPercent: 30,
    airTemperatureCelsius: 16.4,
    humidityPercent: 68,
  });
  assert.deepEqual(result, { water: 'red', temperature: 'yellow', humidity: 'green' });
});

test('fertiliser hint', () => {
  const herbs = plan('E', 2);
  assert.equal(fertiliserHint(herbs.stages[0]), 'Kein Dünger nötig');
  assert.equal(fertiliserHint(herbs.stages[1]), 'Diese Woche 3 Löffel Dünger');
  assert.equal(fertiliserHint(herbs.stages[2]), 'Beim Nachgießen 0,75 Löffel Dünger pro Liter');
});

test('progress image follows the original week mapping', () => {
  const tomatoes = plan('E', 5);
  assert.equal(progressImage(tomatoes, 0), 'progress-0');
  assert.equal(progressImage(tomatoes, 12), 'progress-3');
  assert.equal(progressImage(tomatoes, 13), 'progress-tomato-unripe');
  assert.equal(progressImage(tomatoes, 15), 'progress-tomato-ripe');
  assert.equal(progressImage(tomatoes, 40), 'progress-tomato-ripe');
  assert.equal(progressImage(plan('E', 6), 16), 'progress-chili-ripe');
  assert.equal(progressImage(plan('E', 7), 98), 'progress-4');
  assert.equal(progressImage(newCustomPlan('x'), 3), 'progress-3');
});

test('program image per plan', () => {
  assert.equal(programImage(plan('E', 1)), 'program-basil');
  assert.equal(programImage(plan('S', 7)), 'program-lettuce-herbs');
  assert.equal(programImage(newCustomPlan('x')), 'program-general');
});

test('a new custom plan starts from the general program', () => {
  const custom = newCustomPlan('abc');
  assert.equal(custom.key, 'custom:abc');
  assert.equal(custom.builtIn, false);
  assert.deepEqual(custom.stages, plan('E', 255).stages);
});
