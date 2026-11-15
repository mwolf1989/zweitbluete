// smartGarten BLE protocol, firmware 1.10.0. See ../../docs/protocol.md for
// how each layout was established and which parts are still unconfirmed.

export const SERVICE_UUID = '71d7fe50-a841-4c27-9a80-5307bee17c2a';

const characteristic = (id: string) => `b954${id}-3156-4921-a5c3-ed399d9b4433`;

export const CHARACTERISTIC = {
  firmware: characteristic('4000'),
  gardenInfo: characteristic('4001'),
  status: characteristic('4002'),
  light: characteristic('4003'),
  time: characteristic('400f'),
  sensorConfig: characteristic('4016'),
} as const;

export const DEVICE_NAME_PREFIX = 'smartGarten';

export const MINUTES_PER_DAY = 24 * 60;

export type GardenStatus = {
  waterLevelPercent: number;
  airTemperatureCelsius: number;
  humidityPercent: number;
  // Fields 3-5 are water temperature and TDS readings on models that have
  // those sensors; their exact order is unconfirmed, so they stay raw.
  extra: [number, number, number];
};

export type LightSchedule = {
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  intensity: number; // 0-255
  // Device-clock seconds until which the lamp stays off; 0 means no snooze.
  snoozeUntil: number;
};

// A bed that has not been started has no start time. The firmware only stores
// these bytes, so "start 0" as the empty value is this app's convention.
export type Bed = {
  startedAt: Date | null;
  programId: number;
};

export const SNOOZE_SECONDS = 30 * 60;

export type SensorConfig = {
  time: number;
  airTemperatureHumidity: number;
  waterTemperature: number;
  tds: number;
  waterLevel: number;
  light: number;
};

export const PLANT_PROGRAMS: Record<number, string> = {
  1: 'Basilikum',
  2: 'Kräuter',
  3: 'Salate',
  4: 'Gemüse',
  5: 'Tomaten',
  6: 'Chilis',
  7: 'Salate und Kräuter',
  255: 'Allgemein',
};

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function expectLength(name: string, bytes: Uint8Array, length: number): void {
  if (bytes.length !== length) {
    throw new Error(`${name}: expected ${length} bytes, got ${bytes.length}`);
  }
}

export function decodeFirmwareVersion(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes);
}

export function decodeStatus(bytes: Uint8Array): GardenStatus {
  expectLength('status', bytes, 24);
  const data = view(bytes);
  const float = (index: number) => data.getFloat32(index * 4, false);
  return {
    waterLevelPercent: float(0),
    airTemperatureCelsius: float(1),
    humidityPercent: float(2),
    extra: [float(3), float(4), float(5)],
  };
}

export function decodeLight(bytes: Uint8Array): LightSchedule {
  expectLength('light', bytes, 9);
  return {
    startHour: bytes[0],
    startMinute: bytes[1],
    durationMinutes: view(bytes).getUint16(2, false),
    intensity: bytes[4],
    snoozeUntil: view(bytes).getUint32(5, false),
  };
}

export function encodeLight(light: LightSchedule): Uint8Array {
  const inRange =
    Number.isInteger(light.startHour) &&
    light.startHour >= 0 &&
    light.startHour < 24 &&
    Number.isInteger(light.startMinute) &&
    light.startMinute >= 0 &&
    light.startMinute < 60 &&
    Number.isInteger(light.durationMinutes) &&
    light.durationMinutes >= 0 &&
    light.durationMinutes < MINUTES_PER_DAY &&
    Number.isInteger(light.intensity) &&
    light.intensity >= 0 &&
    light.intensity <= 255 &&
    Number.isInteger(light.snoozeUntil) &&
    light.snoozeUntil >= 0 &&
    light.snoozeUntil <= 0xffffffff;
  if (!inRange) {
    throw new Error('light: value out of range');
  }

  const bytes = new Uint8Array(9);
  bytes[0] = light.startHour;
  bytes[1] = light.startMinute;
  view(bytes).setUint16(2, light.durationMinutes, false);
  bytes[4] = light.intensity;
  view(bytes).setUint32(5, light.snoozeUntil, false);
  return bytes;
}

export function decodeGardenInfo(bytes: Uint8Array): [Bed, Bed] {
  expectLength('garden info', bytes, 10);
  const data = view(bytes);
  const bed = (offset: number): Bed => {
    const start = data.getUint32(offset, false);
    return { startedAt: start === 0 ? null : new Date(start * 1000), programId: bytes[offset + 4] };
  };
  return [bed(0), bed(5)];
}

export function encodeGardenInfo(beds: [Bed, Bed]): Uint8Array {
  const bytes = new Uint8Array(10);
  beds.forEach((bed, index) => {
    if (!Number.isInteger(bed.programId) || bed.programId < 0 || bed.programId > 255) {
      throw new Error('garden info: program id out of range');
    }
    const start = bed.startedAt ? Math.floor(bed.startedAt.getTime() / 1000) : 0;
    view(bytes).setUint32(index * 5, start, false);
    bytes[index * 5 + 4] = bed.programId;
  });
  return bytes;
}

export function decodeSensorConfig(bytes: Uint8Array): SensorConfig {
  expectLength('sensor config', bytes, 9);
  return {
    time: bytes[0],
    airTemperatureHumidity: bytes[1],
    waterTemperature: bytes[2],
    tds: bytes[3],
    waterLevel: bytes[4],
    light: bytes[5],
  };
}

// The firmware has no timezone and compares the light schedule against the
// hours and minutes of the raw epoch value. Shifting by the local UTC offset
// makes the device clock show local wall time, so schedule times are local.
export function deviceClockSeconds(now: Date): number {
  return Math.floor(now.getTime() / 1000) - now.getTimezoneOffset() * 60;
}

export function encodeDeviceTime(now: Date): Uint8Array {
  const bytes = new Uint8Array(4);
  view(bytes).setUint32(0, deviceClockSeconds(now), false);
  return bytes;
}

export function isSnoozedAt(light: LightSchedule, now: Date): boolean {
  return deviceClockSeconds(now) < light.snoozeUntil;
}

export function lightEndMinuteOfDay(light: LightSchedule): number {
  return (light.startHour * 60 + light.startMinute + light.durationMinutes) % MINUTES_PER_DAY;
}

export function isLightOnAt(light: LightSchedule, now: Date): boolean {
  const start = light.startHour * 60 + light.startMinute;
  const minuteOfDay = now.getHours() * 60 + now.getMinutes();
  const elapsed = (minuteOfDay - start + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return elapsed < light.durationMinutes;
}
