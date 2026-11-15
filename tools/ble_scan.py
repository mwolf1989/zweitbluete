# /// script
# requires-python = ">=3.11"
# dependencies = ["bleak>=0.22"]
# ///
"""Scan for BLE advertisers and print everything they broadcast.

    uv run tools/ble_scan.py [seconds] [name-filter]
"""
import asyncio
import sys

from bleak import BleakScanner


async def main() -> None:
    seconds = float(sys.argv[1]) if len(sys.argv) > 1 else 15.0
    needle = sys.argv[2].lower() if len(sys.argv) > 2 else ""

    found = await BleakScanner.discover(timeout=seconds, return_adv=True)
    rows = sorted(found.values(), key=lambda pair: pair[1].rssi, reverse=True)

    for device, adv in rows:
        name = adv.local_name or device.name or ""
        if needle and needle not in name.lower():
            continue
        print(f"{device.address}  rssi={adv.rssi:>4}  name={name!r}")
        for uuid in adv.service_uuids:
            print(f"    service     {uuid}")
        for company, data in adv.manufacturer_data.items():
            print(f"    mfr 0x{company:04x}  {data.hex()}")
        for uuid, data in adv.service_data.items():
            print(f"    svcdata     {uuid}  {data.hex()}")
        if adv.tx_power is not None:
            print(f"    tx_power    {adv.tx_power}")

    print(f"\n{len(rows)} devices seen in {seconds:.0f}s")


asyncio.run(main())
