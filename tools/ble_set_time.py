# /// script
# requires-python = ">=3.11"
# dependencies = ["bleak>=0.22"]
# ///
"""Set the smartGarten clock (characteristic 400f): 4 bytes, uint32 big-endian
Unix seconds. The firmware has no timezone, so by default the local UTC offset
is added and the device clock shows local wall time.

    uv run tools/ble_set_time.py [--utc]
"""
import asyncio
import sys
import time
from datetime import datetime, timezone

from bleak import BleakClient, BleakScanner

SERVICE = "71d7fe50-a841-4c27-9a80-5307bee17c2a"
TIME = "b954400f-3156-4921-a5c3-ed399d9b4433"


async def main() -> None:
    use_utc = "--utc" in sys.argv

    device = await BleakScanner.find_device_by_filter(
        lambda d, adv: SERVICE in adv.service_uuids, timeout=20
    )
    if device is None:
        sys.exit("smartGarten not found")

    async with BleakClient(device) as client:
        now = int(time.time())
        offset = 0 if use_utc else int(datetime.now().astimezone().utcoffset().total_seconds())
        value = now + offset
        payload = value.to_bytes(4, "big")
        await client.write_gatt_char(TIME, payload, response=True)
        shown = datetime.fromtimestamp(value, timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        print(f"written {payload.hex(' ')}  device clock now reads {shown} (offset {offset:+d}s)")


asyncio.run(main())
