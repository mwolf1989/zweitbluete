import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State } from 'react-native-ble-plx';

import { base64ToBytes, bytesToBase64 } from './base64';
import { SERVICE_UUID } from './protocol';

export const manager = new BleManager();

export type FoundGarden = {
  id: string;
  name: string;
  rssi: number | null;
};

export type GardenConnection = {
  read(characteristic: string): Promise<Uint8Array>;
  write(characteristic: string, value: Uint8Array): Promise<void>;
  monitor(characteristic: string, onValue: (value: Uint8Array) => void): () => void;
  onDisconnected(listener: () => void): () => void;
  disconnect(): Promise<void>;
};

export async function requestBluetoothPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const permissions =
    Platform.Version >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const result = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
}

export function watchBluetoothState(listener: (poweredOn: boolean) => void): () => void {
  const subscription = manager.onStateChange((state) => listener(state === State.PoweredOn), true);
  return () => subscription.remove();
}

export function scanForGardens(
  onFound: (garden: FoundGarden) => void,
  onError: (error: Error) => void,
): () => void {
  manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
    if (error) {
      onError(error);
      return;
    }
    if (device) {
      onFound({
        id: device.id,
        name: device.localName ?? device.name ?? 'smartGarten',
        rssi: device.rssi,
      });
    }
  });
  return () => {
    manager.stopDeviceScan();
  };
}

export async function connectToGarden(id: string): Promise<GardenConnection> {
  const device = await manager.connectToDevice(id);
  await device.discoverAllServicesAndCharacteristics();

  return {
    async read(characteristic) {
      const result = await device.readCharacteristicForService(SERVICE_UUID, characteristic);
      return base64ToBytes(result.value ?? '');
    },
    async write(characteristic, value) {
      await device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        characteristic,
        bytesToBase64(value),
      );
    },
    monitor(characteristic, onValue) {
      const subscription = device.monitorCharacteristicForService(
        SERVICE_UUID,
        characteristic,
        (error, result) => {
          // Errors here mean the link dropped; onDisconnected reports that.
          if (!error && result?.value) {
            onValue(base64ToBytes(result.value));
          }
        },
      );
      return () => subscription.remove();
    },
    onDisconnected(listener) {
      const subscription = device.onDisconnected(() => listener());
      return () => subscription.remove();
    },
    async disconnect() {
      await device.cancelConnection();
    },
  };
}
