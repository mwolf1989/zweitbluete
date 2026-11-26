// Fixtures are values captured from a real device, see ../../captures/.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { base64ToBytes, bytesToBase64 } from './base64';
import {
  availableReadings,
  decodeFirmwareVersion,
  decodeGardenInfo,
  deviceClockSeconds,
  encodeGardenInfo,
  isSnoozedAt,
  decodeLight,
  decodeSensorConfig,
  decodeSeries,
  decodeStatus,
  encodeDeviceTime,
  encodeLight,
  encodeNutrientCalibration,
  firmwareAtLeast,
  encodeSensorBar,
  isLightOnAt,
  lightEndMinuteOfDay,
  sensorBarOf,
  waterDistanceMm,
} from './protocol';

const hex = (text: string) => Uint8Array.from(text.split(' ').map((byte) => parseInt(byte, 16)));

test('firmware version is ASCII', () => {
  assert.equal(decodeFirmwareVersion(hex('31 2e 31 30 2e 30')), '1.10.0');
});

test('status decodes six big-endian floats', () => {
  const status = decodeStatus(
    hex('41 f7 9e 77 41 83 52 1d 42 89 7d 26 00 00 00 00 00 00 00 00 00 00 00 00'),
  );
  assert.ok(Math.abs(status.waterLevelPercent - 30.952) < 0.001);
  assert.ok(Math.abs(status.airTemperatureCelsius - 16.415) < 0.001);
  assert.ok(Math.abs(status.humidityPercent - 68.744) < 0.001);
  assert.equal(status.waterTemperatureCelsius, 0);
  assert.equal(status.factoryEc, 0);
  assert.equal(status.userEc, 0);
});

test('light round-trips the captured value', () => {
  const captured = hex('05 00 03 48 ff 00 00 00 00');
  const light = decodeLight(captured);
  assert.equal(light.startHour, 5);
  assert.equal(light.startMinute, 0);
  assert.equal(light.durationMinutes, 840);
  assert.equal(light.intensity, 255);
  assert.deepEqual(encodeLight(light), captured);
});

test('light encodes the payload that dimmed the lamp', () => {
  const light = decodeLight(hex('05 00 03 48 ff 00 00 00 00'));
  const dimmed = encodeLight({ ...light, startHour: 0, durationMinutes: 1439, intensity: 0x40 });
  assert.deepEqual(dimmed, hex('00 00 05 9f 40 00 00 00 00'));
});

test('light rejects out-of-range values', () => {
  const light = decodeLight(hex('05 00 03 48 ff 00 00 00 00'));
  assert.throws(() => encodeLight({ ...light, startHour: 24 }));
  assert.throws(() => encodeLight({ ...light, durationMinutes: 1440 }));
  assert.throws(() => encodeLight({ ...light, intensity: 256 }));
});

test('garden info decodes two beds', () => {
  const [first, second] = decodeGardenInfo(hex('67 71 53 85 07 67 71 53 5f 02'));
  assert.equal(first.startedAt?.toISOString(), '2024-12-29T13:49:57.000Z');
  assert.equal(first.programId, 7);
  assert.equal(second.startedAt?.toISOString(), '2024-12-29T13:49:19.000Z');
  assert.equal(second.programId, 2);
});

test('garden info round-trips, including an empty bed', () => {
  const captured = hex('67 71 53 85 07 67 71 53 5f 02');
  assert.deepEqual(encodeGardenInfo(decodeGardenInfo(captured)), captured);

  const [first] = decodeGardenInfo(captured);
  const withEmptyBed = encodeGardenInfo([first, { startedAt: null, programId: 0 }]);
  assert.deepEqual(withEmptyBed, hex('67 71 53 85 07 00 00 00 00 00'));
  assert.equal(decodeGardenInfo(withEmptyBed)[1].startedAt, null);
});

test('snooze is a device-clock timestamp in bytes 5-8', () => {
  // Value written to the device during the snooze test.
  const light = decodeLight(hex('05 00 03 48 ff 6a f9 b6 74'));
  assert.equal(light.snoozeUntil, 0x6af9b674);
  assert.deepEqual(encodeLight(light), hex('05 00 03 48 ff 6a f9 b6 74'));

  const now = new Date(2026, 10, 15, 13, 40, 0);
  const until = deviceClockSeconds(now) + 60;
  assert.equal(isSnoozedAt({ ...light, snoozeUntil: until }, now), true);
  assert.equal(isSnoozedAt({ ...light, snoozeUntil: until }, new Date(now.getTime() + 61_000)), false);
  assert.equal(isSnoozedAt({ ...light, snoozeUntil: 0 }, now), false);
});

test('series byte as the original app reads it', () => {
  assert.equal(decodeSeries(hex('00')), 'standard'); // value read from the test device
  assert.equal(decodeSeries(hex('01')), 'S');
  assert.equal(decodeSeries(hex('02')), 'E');
});

test('sensor config decodes six sensor types', () => {
  assert.deepEqual(decodeSensorConfig(hex('01 02 00 00 01 01 01 00 00')), {
    time: 1,
    airTemperatureHumidity: 2,
    waterTemperature: 0,
    tds: 1,
    waterLevel: 1,
    light: 1,
  });
});

test('sensor bar presets match the original app', () => {
  // The value read from the test device is the "v2" preset.
  const captured = hex('01 02 00 00 01 01 01 00 00');
  assert.equal(sensorBarOf(decodeSensorConfig(captured)), 'v2');
  assert.deepEqual(encodeSensorBar('v2'), captured);
  assert.deepEqual(encodeSensorBar('v1'), hex('01 01 00 00 01 01 01 00 00'));
  assert.deepEqual(encodeSensorBar('none'), hex('00 00 00 00 00 00 00 00 00'));
  assert.equal(sensorBarOf(decodeSensorConfig(hex('01 02 00 00 00 01 01 00 00'))), null);
});

test('nutrient calibration messages match the original app', () => {
  // 1450.0 and 530.0 as float32 big-endian after the start byte.
  assert.deepEqual(encodeNutrientCalibration(1450), hex('01 44 b5 40 00'));
  assert.deepEqual(encodeNutrientCalibration(530), hex('01 44 04 80 00'));
});

test('firmware version comparison', () => {
  assert.equal(firmwareAtLeast('1.10.0', 1, 6), true);
  assert.equal(firmwareAtLeast('1.6.0', 1, 6), true);
  assert.equal(firmwareAtLeast('1.5.9', 1, 6), false);
  assert.equal(firmwareAtLeast('2.0.0', 1, 6), true);
});

test('device time is local wall time as epoch', () => {
  const now = new Date(2026, 10, 15, 13, 16, 58);
  const bytes = encodeDeviceTime(now);
  const epoch = new DataView(bytes.buffer).getUint32(0, false);
  const shown = new Date(epoch * 1000);
  assert.equal(shown.getUTCHours(), 13);
  assert.equal(shown.getUTCMinutes(), 16);
  assert.equal(shown.getUTCDate(), 15);
});

test('light window handles wrap past midnight', () => {
  const light = decodeLight(hex('14 00 03 48 ff 00 00 00 00')); // 20:00 + 14 h
  assert.equal(lightEndMinuteOfDay(light), 10 * 60);
  assert.equal(isLightOnAt(light, new Date(2026, 0, 1, 23, 0)), true);
  assert.equal(isLightOnAt(light, new Date(2026, 0, 1, 9, 59)), true);
  assert.equal(isLightOnAt(light, new Date(2026, 0, 1, 10, 0)), false);
  assert.equal(isLightOnAt(light, new Date(2026, 0, 1, 19, 59)), false);
});

test('water level percent maps back to the sensor distance', () => {
  assert.equal(waterDistanceMm(100), 38);
  assert.equal(waterDistanceMm(0), 164);
  // Readings from the device step by one millimetre: 39/126 and 36/126.
  assert.ok(Math.abs(waterDistanceMm(30.952375411987305) - 125) < 1e-3);
  assert.ok(Math.abs(waterDistanceMm(28.57142448425293) - 128) < 1e-3);
});

test('base64 round-trips every padding length', () => {
  for (const sample of ['', '00', '00 01', '00 01 02', '6a f9 b0 ca', '05 00 03 48 ff 00 00 00 00']) {
    const bytes = sample ? hex(sample) : new Uint8Array();
    const encoded = bytesToBase64(bytes);
    assert.equal(encoded, Buffer.from(bytes).toString('base64'));
    assert.deepEqual(base64ToBytes(encoded), bytes);
  }
});

const V2 = decodeSensorConfig(hex('01 02 00 00 01 01 01 00 00'));
const zeros = decodeStatus(new Uint8Array(24));

test('all-zero readings mean the sensor bar is missing', () => {
  // A smartGarten E without sensor bar, sensor config still on v2.
  assert.deepEqual(availableReadings(zeros, V2), { air: false, water: false });
});

test('real readings are available', () => {
  const status = decodeStatus(
    hex('41 f7 9e 77 41 83 52 1d 42 89 7d 26 00 00 00 00 00 00 00 00 00 00 00 00'),
  );
  assert.deepEqual(availableReadings(status, V2), { air: true, water: true });
});

test('an empty tank alone still counts as a reading', () => {
  const status = { ...zeros, airTemperatureCelsius: 21.3, humidityPercent: 55 };
  assert.deepEqual(availableReadings(status, V2), { air: true, water: true });
});

test('a sensor switched off in the config has no reading', () => {
  const status = { ...zeros, waterLevelPercent: 40, airTemperatureCelsius: 21.3, humidityPercent: 55 };
  const config = { ...V2, airTemperatureHumidity: 0, waterLevel: 0 };
  assert.deepEqual(availableReadings(status, config), { air: false, water: false });
});
