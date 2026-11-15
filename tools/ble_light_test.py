# /// script
# requires-python = ">=3.11"
# dependencies = ["bleak>=0.22"]
# ///
"""Confirm the layout of the light characteristic (4003) by changing only the
assumed intensity byte, holding it, and writing the original value back.

    uv run tools/ble_light_test.py [intensity 0-255] [hold-seconds]
"""
import asyncio
import sys

from bleak import BleakClient, BleakScanner

SERVICE = "71d7fe50-a841-4c27-9a80-5307bee17c2a"
LIGHT = "b9544003-3156-4921-a5c3-ed399d9b4433"
INTENSITY_OFFSET = 4


async def main() -> None:
    intensity = int(sys.argv[1]) if len(sys.argv) > 1 else 0x40
    hold = float(sys.argv[2]) if len(sys.argv) > 2 else 10.0

    device = await BleakScanner.find_device_by_filter(
        lambda d, adv: SERVICE in adv.service_uuids, timeout=20
    )
    if device is None:
        sys.exit("smartGarten not found")

    async with BleakClient(device) as client:
        original = bytes(await client.read_gatt_char(LIGHT))
        print(f"original   {original.hex(' ')}", flush=True)
        if len(original) != 9:
            sys.exit("unexpected length, not writing")

        changed = bytearray(original)
        changed[INTENSITY_OFFSET] = intensity
        try:
            await client.write_gatt_char(LIGHT, bytes(changed), response=True)
            print(f"written    {bytes(changed).hex(' ')}", flush=True)
            readback = bytes(await client.read_gatt_char(LIGHT))
            print(f"read back  {readback.hex(' ')}", flush=True)
            print(f"holding {hold:.0f}s - watch the lamp", flush=True)
            await asyncio.sleep(hold)
        finally:
            await client.write_gatt_char(LIGHT, original, response=True)
            restored = bytes(await client.read_gatt_char(LIGHT))
            print(f"restored   {restored.hex(' ')}", flush=True)
            print("restore ok" if restored == original else "RESTORE MISMATCH", flush=True)


asyncio.run(main())
