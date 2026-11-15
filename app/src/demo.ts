// In-memory stand-in for a smartGarten, for simulators (which have no
// Bluetooth) and for trying the app without a device. Values mirror a capture
// from a real device.
import { FoundGarden, GardenConnection } from './ble';
import { t } from './i18n';
import { CHARACTERISTIC } from './protocol';

export const DEMO_GARDEN_ID = 'demo';

export function demoGarden(): FoundGarden {
  return { id: DEMO_GARDEN_ID, name: t('demo_name'), rssi: null };
}

const STATUS_INTERVAL_MS = 5000;
const CALIBRATION_MS = 2000;
const SECONDS_PER_WEEK = 7 * 24 * 60 * 60;

function statusBytes(): Uint8Array {
  const bytes = new Uint8Array(24);
  const data = new DataView(bytes.buffer);
  data.setFloat32(0, 62 + Math.random() * 2, false);
  data.setFloat32(4, 21.5 + Math.random() * 0.3, false);
  data.setFloat32(8, 55 + Math.random() * 2, false);
  data.setFloat32(16, 820 + Math.random() * 10, false); // nutrient reading, factory calibration
  return bytes;
}

function gardenInfoBytes(): Uint8Array {
  const bytes = new Uint8Array(10);
  const data = new DataView(bytes.buffer);
  const now = Math.floor(Date.now() / 1000);
  data.setUint32(0, now - 3 * SECONDS_PER_WEEK, false);
  bytes[4] = 7;
  data.setUint32(5, now - 1 * SECONDS_PER_WEEK, false);
  bytes[9] = 5;
  return bytes;
}

export async function connectToDemoGarden(): Promise<GardenConnection> {
  const values: Record<string, Uint8Array> = {
    [CHARACTERISTIC.firmware]: Uint8Array.from('1.10.0', (character) => character.charCodeAt(0)),
    [CHARACTERISTIC.gardenInfo]: gardenInfoBytes(),
    [CHARACTERISTIC.light]: Uint8Array.from([6, 0, 0x03, 0x48, 0xff, 0, 0, 0, 0]),
    [CHARACTERISTIC.sensorConfig]: Uint8Array.from([1, 2, 0, 0, 1, 1, 1, 0, 0]),
    [CHARACTERISTIC.series]: Uint8Array.of(0),
  };
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const disconnectListeners = new Set<() => void>();
  const calibrationListeners = new Set<(value: Uint8Array) => void>();
  const nutrientListeners = new Set<(value: Uint8Array) => void>();

  return {
    async read(characteristic) {
      return characteristic === CHARACTERISTIC.status ? statusBytes() : values[characteristic];
    },
    async write(characteristic, value) {
      if (characteristic === CHARACTERISTIC.fillCalibration) {
        const finished = setTimeout(() => {
          timers.delete(finished);
          calibrationListeners.forEach((listener) => listener(Uint8Array.of(0)));
        }, CALIBRATION_MS);
        timers.add(finished);
        return;
      }
      if (characteristic === CHARACTERISTIC.nutrientCalibration) {
        const finished = setTimeout(() => {
          timers.delete(finished);
          nutrientListeners.forEach((listener) => listener(Uint8Array.of(0)));
        }, CALIBRATION_MS);
        timers.add(finished);
        return;
      }
      values[characteristic] = value;
    },
    monitor(characteristic, onValue) {
      if (characteristic === CHARACTERISTIC.fillCalibration) {
        calibrationListeners.add(onValue);
        return () => calibrationListeners.delete(onValue);
      }
      if (characteristic === CHARACTERISTIC.nutrientCalibration) {
        nutrientListeners.add(onValue);
        return () => nutrientListeners.delete(onValue);
      }
      if (characteristic !== CHARACTERISTIC.status) {
        return () => {};
      }
      const timer = setInterval(() => onValue(statusBytes()), STATUS_INTERVAL_MS);
      timers.add(timer);
      return () => {
        clearInterval(timer);
        timers.delete(timer);
      };
    },
    onDisconnected(listener) {
      disconnectListeners.add(listener);
      return () => disconnectListeners.delete(listener);
    },
    async disconnect() {
      timers.forEach(clearInterval);
      timers.clear();
      disconnectListeners.forEach((listener) => listener());
    },
  };
}
