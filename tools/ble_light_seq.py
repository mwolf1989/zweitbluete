# /// script
# requires-python = ">=3.11"
# dependencies = ["bleak>=0.22"]
# ///
"""Write a sequence of 9-byte payloads to the light characteristic (4003),
holding each one, then always write the original value back.

    uv run tools/ble_light_seq.py <hold-seconds> <hex> [<hex> ...]
    uv run tools/ble_light_seq.py 15 000005a0ff00000000 000005a04000000000
"""
import asyncio
import sys

from bleak import BleakClient, BleakScanner

SERVICE = "71d7fe50-a841-4c27-9a80-5307bee17c2a"
LIGHT = "b9544003-3156-4921-a5c3-ed399d9b4433"


async def main() -> None:
    hold = float(sys.argv[1])
    payloads = [bytes.fromhex(arg) for arg in sys.argv[2:]]
    if not payloads or any(len(p) != 9 for p in payloads):
        sys.exit("need one or more 9-byte hex payloads")

    device = await BleakScanner.find_device_by_filter(
        lambda d, adv: SERVICE in adv.service_uuids, timeout=20
    )
    if device is None:
        sys.exit("smartGarten not found")

    async with BleakClient(device) as client:
        original = bytes(await client.read_gatt_char(LIGHT))
        print(f"original   {original.hex(' ')}", flush=True)
        try:
            for step, payload in enumerate(payloads, start=1):
                await client.write_gatt_char(LIGHT, payload, response=True)
                readback = bytes(await client.read_gatt_char(LIGHT))
                print(f"step {step}     {readback.hex(' ')}  holding {hold:.0f}s", flush=True)
                await asyncio.sleep(hold)
        finally:
            await client.write_gatt_char(LIGHT, original, response=True)
            restored = bytes(await client.read_gatt_char(LIGHT))
            print(f"restored   {restored.hex(' ')}", flush=True)
            print("restore ok" if restored == original else "RESTORE MISMATCH", flush=True)


asyncio.run(main())
