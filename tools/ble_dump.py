# /// script
# requires-python = ">=3.11"
# dependencies = ["bleak>=0.22"]
# ///
"""Connect to a BLE device, dump its GATT table, read every readable
characteristic and listen on every notify/indicate one. Writes nothing
except the CCCD subscriptions.

    uv run tools/ble_dump.py [name-prefix] [listen-seconds]
"""
import asyncio
import sys
from datetime import datetime

from bleak import BleakClient, BleakScanner


def show(data: bytes) -> str:
    text = "".join(chr(b) if 32 <= b < 127 else "." for b in data)
    return f"{data.hex(' ')}  |{text}|  ({len(data)} bytes)"


async def main() -> None:
    prefix = sys.argv[1] if len(sys.argv) > 1 else "smartGarten"
    listen = float(sys.argv[2]) if len(sys.argv) > 2 else 20.0

    device = await BleakScanner.find_device_by_filter(
        lambda d, adv: (adv.local_name or d.name or "").startswith(prefix),
        timeout=20,
    )
    if device is None:
        sys.exit(f"no device with name prefix {prefix!r} found")
    print(f"connecting to {device.name} ({device.address})")

    async with BleakClient(device) as client:
        print(f"connected, mtu={client.mtu_size}\n")
        subscribable = []

        for service in client.services:
            print(f"SERVICE {service.uuid}  ({service.description})")
            for char in service.characteristics:
                props = ",".join(char.properties)
                print(f"  CHAR {char.uuid}  handle={char.handle}  [{props}]  ({char.description})")
                if "read" in char.properties:
                    try:
                        print(f"       value: {show(await client.read_gatt_char(char))}")
                    except Exception as error:
                        print(f"       read failed: {error}")
                for desc in char.descriptors:
                    try:
                        value = show(await client.read_gatt_descriptor(desc.handle))
                    except Exception as error:
                        value = f"read failed: {error}"
                    print(f"       DESC {desc.uuid}  handle={desc.handle}  {value}")
                if {"notify", "indicate"} & set(char.properties):
                    subscribable.append(char)
            print()

        def on_notify(char, data: bytearray) -> None:
            stamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            print(f"{stamp}  NOTIFY {char.uuid}  {show(bytes(data))}")

        for char in subscribable:
            try:
                await client.start_notify(char, on_notify)
                print(f"subscribed {char.uuid}")
            except Exception as error:
                print(f"subscribe failed {char.uuid}: {error}")

        print(f"\nlistening {listen:.0f}s ...")
        await asyncio.sleep(listen)


asyncio.run(main())
