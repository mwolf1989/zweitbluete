import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HELP_TOPICS, helpLink } from './help';

test('every series has an archived link for every topic', () => {
  for (const series of ['standard', 'S', 'E'] as const) {
    for (const topic of HELP_TOPICS) {
      assert.match(helpLink(series, topic), /^https:\/\/web\.archive\.org\/web\/\d{14}\//);
    }
  }
});

test('links point at the archived copy for the right model', () => {
  assert.equal(
    helpLink('E', 'manual'),
    'https://web.archive.org/web/20240706061040/https://cdn.shopify.com/s/files/1/0644/7038/4874/files/Manual_smartGarten_E_DE_A5.pdf?v=1682062130',
  );
  assert.match(helpLink('S', 'care'), /web\.archive\.org.*PflegeS\.pdf/);
  assert.match(helpLink('standard', 'manual'), /web\.archive\.org.*Manual_smartGarten__X__/);
  assert.equal(
    helpLink('standard', 'faq'),
    'https://web.archive.org/web/20231201092405/https://simpleplant.de/pages/faq',
  );
});
