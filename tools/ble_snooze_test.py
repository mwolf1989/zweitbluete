# /// script
# requires-python = ">=3.11"
# dependencies = ["bleak>=0.22"]
# ///
"""Confirm two write formats on the device:

- garden info (4001): write the value just read back unchanged (accepted?).
- light (4003) bytes 5-8: uint32 big-endian "snoozed until" in device time.
  Sets a short snooze, waits for it to expire, then restores the original.

Assumes the device clock was set with ble_set_time.py (local time as epoch).

    uv run tools/ble_snooze_test.py [snooze-seconds]
"""
import asyncio
import sys
import time
from datetime import datetime

from bleak import BleakClient, BleakScanner

SERVICE = "71d7fe50-a841-4c27-9a80-5307bee17c2a"
INFO = "b9544001-3156-4921-a5c3-ed399d9b4433"
LIGHT = "b9544003-3156-4921-a5c3-ed399d9b4433"


def device_now() -> int:
    offset = int(datetime.now().astimezone().utcoffset().total_seconds())
    return int(time.time()) + offset


async def main() -> None:
    seconds = int(sys.argv[1]) if len(sys.argv) > 1 else 40

    device = await BleakScanner.find_device_by_filter(
        lambda d, adv: SERVICE in adv.service_uuids, timeout=20
    )
    if device is None:
        sys.exit("smartGarten not found")

    async with BleakClient(device) as client:
        info = bytes(await client.read_gatt_char(INFO))
        await client.write_gatt_char(INFO, info, response=True)
        after = bytes(await client.read_gatt_char(INFO))
        print(f"info       {info.hex(' ')} -> rewrite {'ok' if after == info else 'CHANGED ' + after.hex(' ')}", flush=True)

        original = bytes(await client.read_gatt_char(LIGHT))
        print(f"original   {original.hex(' ')}", flush=True)
        if len(original) != 9:
            sys.exit("unexpected length, not writing")
        try:
            snoozed = original[:5] + (device_now() + seconds).to_bytes(4, "big")
            await client.write_gatt_char(LIGHT, snoozed, response=True)
            print(f"snoozed    {bytes(await client.read_gatt_char(LIGHT)).hex(' ')}  lamp should be off for {seconds}s", flush=True)
            await asyncio.sleep(seconds + 20)
            print(f"after      {bytes(await client.read_gatt_char(LIGHT)).hex(' ')}  lamp should be back on", flush=True)
            await asyncio.sleep(10)
        finally:
            await client.write_gatt_char(LIGHT, original, response=True)
            restored = bytes(await client.read_gatt_char(LIGHT))
            print(f"restored   {restored.hex(' ')}", flush=True)
            print("restore ok" if restored == original else "RESTORE MISMATCH", flush=True)


asyncio.run(main())
