# /// script
# requires-python = ">=3.11"
# dependencies = ["bleak>=0.22"]
# ///
"""Re-read every readable characteristic of the smartGarten service at an
interval and print values whenever they change. Read-only.

    uv run tools/ble_poll.py [rounds] [interval-seconds]
"""
import asyncio
import sys
import time

from bleak import BleakClient, BleakScanner

SERVICE = "71d7fe50-a841-4c27-9a80-5307bee17c2a"


async def main() -> None:
    rounds = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    interval = float(sys.argv[2]) if len(sys.argv) > 2 else 5.0

    device = await BleakScanner.find_device_by_filter(
        lambda d, adv: SERVICE in adv.service_uuids, timeout=20
    )
    if device is None:
        sys.exit("smartGarten not found")

    async with BleakClient(device) as client:
        chars = [
            c
            for c in client.services.get_service(SERVICE).characteristics
            if "read" in c.properties
        ]
        last: dict[str, bytes] = {}
        for round_no in range(rounds):
            print(f"--- round {round_no}  host_unix={int(time.time())}", flush=True)
            for char in chars:
                value = bytes(await client.read_gatt_char(char))
                if last.get(char.uuid) != value:
                    print(f"{char.uuid[4:8]}  {value.hex(' ')}", flush=True)
                    last[char.uuid] = value
            await asyncio.sleep(interval)


asyncio.run(main())
