import { useCallback, useEffect, useRef, useState } from 'react';

import {
  connectToGarden,
  FoundGarden,
  GardenConnection,
  requestBluetoothPermission,
  scanForGardens,
  watchBluetoothState,
} from './ble';
import { connectToDemoGarden, DEMO_GARDEN } from './demo';
import {
  Bed,
  CHARACTERISTIC,
  decodeFirmwareVersion,
  decodeGardenInfo,
  decodeLight,
  decodeSensorConfig,
  decodeStatus,
  encodeDeviceTime,
  encodeGardenInfo,
  encodeLight,
  GardenStatus,
  LightSchedule,
  SensorConfig,
} from './protocol';

export type Garden = {
  id: string;
  name: string;
  firmware: string;
  beds: [Bed, Bed];
  sensorConfig: SensorConfig;
  light: LightSchedule;
  status: GardenStatus | null;
};

export type GardenState =
  | { phase: 'scanning'; found: FoundGarden[] }
  | { phase: 'connecting'; name: string }
  | { phase: 'connected'; garden: Garden };

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useGarden() {
  const [bluetoothOn, setBluetoothOn] = useState(false);
  const [permitted, setPermitted] = useState<boolean | null>(null);
  const [state, setState] = useState<GardenState>({ phase: 'scanning', found: [] });
  const [error, setError] = useState<string | null>(null);
  const connection = useRef<GardenConnection | null>(null);

  useEffect(() => watchBluetoothState(setBluetoothOn), []);

  useEffect(() => {
    requestBluetoothPermission().then(setPermitted, () => setPermitted(false));
  }, []);

  const scanning = state.phase === 'scanning';
  useEffect(() => {
    if (!scanning || !bluetoothOn || !permitted) {
      return;
    }
    return scanForGardens(
      (garden) =>
        setState((current) =>
          current.phase === 'scanning'
            ? {
                phase: 'scanning',
                found: [...current.found.filter((other) => other.id !== garden.id), garden],
              }
            : current,
        ),
      (scanError) => setError(messageOf(scanError)),
    );
  }, [scanning, bluetoothOn, permitted]);

  const connect = useCallback(async (found: FoundGarden) => {
    setError(null);
    setState({ phase: 'connecting', name: found.name });
    try {
      const link =
        found.id === DEMO_GARDEN.id ? await connectToDemoGarden() : await connectToGarden(found.id);
      connection.current = link;
      link.onDisconnected(() => {
        connection.current = null;
        setState({ phase: 'scanning', found: [] });
      });

      // The device clock drifts or resets and cannot be read back, so it is
      // set on every connection before anything depends on the schedule.
      await link.write(CHARACTERISTIC.time, encodeDeviceTime(new Date()));

      const garden: Garden = {
        id: found.id,
        name: found.name,
        firmware: decodeFirmwareVersion(await link.read(CHARACTERISTIC.firmware)),
        beds: decodeGardenInfo(await link.read(CHARACTERISTIC.gardenInfo)),
        sensorConfig: decodeSensorConfig(await link.read(CHARACTERISTIC.sensorConfig)),
        light: decodeLight(await link.read(CHARACTERISTIC.light)),
        status: decodeStatus(await link.read(CHARACTERISTIC.status)),
      };
      setState({ phase: 'connected', garden });

      link.monitor(CHARACTERISTIC.status, (value) => {
        const status = decodeStatus(value);
        setState((current) =>
          current.phase === 'connected'
            ? { phase: 'connected', garden: { ...current.garden, status } }
            : current,
        );
      });
    } catch (connectError) {
      const link = connection.current;
      connection.current = null;
      link?.disconnect().catch(() => {});
      setError(messageOf(connectError));
      setState({ phase: 'scanning', found: [] });
    }
  }, []);

  const disconnect = useCallback(async () => {
    const link = connection.current;
    connection.current = null;
    setState({ phase: 'scanning', found: [] });
    await link?.disconnect().catch(() => {});
  }, []);

  const saveLight = useCallback(async (light: LightSchedule) => {
    const link = connection.current;
    if (!link) {
      return;
    }
    setError(null);
    try {
      await link.write(CHARACTERISTIC.light, encodeLight(light));
      const stored = decodeLight(await link.read(CHARACTERISTIC.light));
      setState((current) =>
        current.phase === 'connected'
          ? { phase: 'connected', garden: { ...current.garden, light: stored } }
          : current,
      );
    } catch (writeError) {
      setError(messageOf(writeError));
    }
  }, []);

  const saveBeds = useCallback(async (beds: [Bed, Bed]) => {
    const link = connection.current;
    if (!link) {
      return;
    }
    setError(null);
    try {
      await link.write(CHARACTERISTIC.gardenInfo, encodeGardenInfo(beds));
      const stored = decodeGardenInfo(await link.read(CHARACTERISTIC.gardenInfo));
      setState((current) =>
        current.phase === 'connected'
          ? { phase: 'connected', garden: { ...current.garden, beds: stored } }
          : current,
      );
    } catch (writeError) {
      setError(messageOf(writeError));
    }
  }, []);

  return { bluetoothOn, permitted, state, error, connect, disconnect, saveLight, saveBeds };
}
