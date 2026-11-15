"""Convert the plant databases bundled in the original app (CSV, semicolon
separated, German decimals) into one JSON file for the new app.

    python3 -I tools/extract_plantdb.py <plantdb-dir> <output.json>
"""
import csv
import json
import sys
from pathlib import Path


def number(text: str) -> float:
    value = float(text.strip().rstrip("%").replace(",", "."))
    return int(value) if value.is_integer() else value


def weeks(text: str) -> list[int]:
    return sorted({int(part) for part in text.split(",")})


def rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle, delimiter=";"))


def span(row: dict[str, str], low: str, high: str) -> list[float]:
    return [number(row[low]), number(row[high])]


def sensor_stage(row: dict[str, str]) -> dict:
    return {
        "weeks": weeks(row["Woche"]),
        "lightHours": number(row["Lichtstunden"]),
        "ec": {
            "target": number(row["EC-Soll"]),
            "green": span(row, "EC-Grün-Untergrenze", "EC-Grün-Obergrenze"),
            "yellow": [span(row, "EC-Gelb-Untergrenze", "EC-Gelb-Obergrenze")],
            "red": [
                span(row, "EC-Rot-Untergrenze1", "EC-Rot-Obergrenze1"),
                span(row, "EC-Rot-Untergrenze2", "EC-Rot-Obergrenze2"),
            ],
        },
        "waterPercent": {
            "target": number(row["Wasser Soll"]),
            "green": span(row, "Wasser-Grün-Untergrenze", "Wasser-Grün-Obergrenze"),
            "yellow": [
                span(row, "Wasser-Gelb-Untergrenze", "Wasser-Gelb-Obergrenze"),
                span(row, "Wasser-Gelb-Untergrenze2", "Wasser-Gelb-Obergrenze2"),
            ],
            "red": [
                span(row, "Wasser-Rot-Untergrenze1", "Wasser-Rot-Obergrenze1"),
                span(row, "Wasser-Rot-Untergrenze2", "Wasser-Rot-Obergrenze2"),
            ],
        },
        "temperatureCelsius": {
            "green": span(row, "Temperatur-Grün-Untergrenze", "Temperatur-Grün-Obergrenze"),
            "yellow": [span(row, "Temperatur-Gelb-Untergrenze", "Temperatur-Gelb-Obergrenze")],
            "red": [
                span(row, "Temperatur-Rot-Untergrenze1", "Temperatur-Rot-Obergrenze1"),
                span(row, "Temperatur-Rot-Untergrenze2", "Temperatur-Rot-Obergrenze2"),
            ],
        },
        "humidityPercent": {
            "green": span(row, "Feuchtigkeit-Grün-Untergrenze", "Feuchtigkeit-Grün-Obergrenze"),
            "yellow": [span(row, "Feuchtigkeit-Gelb-Untergrenze", "Feuchtigkeit-Gelb-Obergrenze")],
            "red": [
                span(row, "Feuchtigkeit-Rot-Untergrenze1", "Feuchtigkeit-Rot-Obergrenze1"),
                span(row, "Feuchtigkeit-Rot-Untergrenze2", "Feuchtigkeit-Rot-Obergrenze2"),
            ],
        },
    }


def simple_stage(row: dict[str, str]) -> dict:
    return {
        "weeks": weeks(row["Woche"]),
        "phase": row["Wasser-Wert"].strip(),
        "lightHours": number(row["Lichtstunden"]),
        "spoonsPerWeek": number(row["Düngen/Woche"]),
        "spoonsPerLitreRefill": number(row["Düngen/Gießen"]),
    }


ICON_KEYS = {
    "Fortschritt_0_Icon.svg": "progress-0",
    "Fortschritt_1_Icon.svg": "progress-1",
    "Fortschritt_2_Icon.svg": "progress-2",
    "Fortschritt_3_Icon.svg": "progress-3",
    "Fortschritt_4_Icon.svg": "progress-4",
    "Fortschritt_Tomate-unreif_Icon.svg": "progress-tomato-unripe",
    "Fortschritt_Tomate-reif_Icon.svg": "progress-tomato-ripe",
    "Fortschritt_Chili-unreif_Icon.svg": "progress-chili-unripe",
    "Fortschritt_Chili-reif_Icon.svg": "progress-chili-ripe",
}


def progress_images(path: Path) -> dict[str, list[str]]:
    """Per program, the image key for each week (list index = week)."""
    by_program: dict[str, dict[int, str]] = {}
    for row in rows(path):
        key = ICON_KEYS[row["Icon"].strip().rsplit("/", 1)[-1]]
        by_program.setdefault(row["ID"].strip(), {})[int(row["Woche"])] = key
    result = {}
    for program, by_week in by_program.items():
        if sorted(by_week) != list(range(len(by_week))):
            raise ValueError(f"program {program}: weeks are not contiguous from 0")
        result[program] = [by_week[week] for week in range(len(by_week))]
    return result


def grouped(path: Path, convert) -> dict[str, list[dict]]:
    result: dict[str, list[dict]] = {}
    for row in rows(path):
        result.setdefault(row["ID"].strip(), []).append(convert(row))
    return result


def main() -> None:
    source = Path(sys.argv[1])
    names = {}
    for row in rows(source / "Pflanzenprogramme_Datenbank.csv"):
        names[row["ID"].strip()] = row["Programm"].strip()

    output = {
        "programs": [{"id": int(key), "name": name} for key, name in sorted(names.items(), key=lambda item: int(item[0]))],
        "sensor": grouped(source / "Pflanzenprogramme_Datenbank.csv", sensor_stage),
        "seriesE": grouped(source / "Pflanzenprogramme_Datenbank_E.csv", simple_stage),
        "seriesS": grouped(source / "Pflanzenprogramme_Datenbank_S.csv", simple_stage),
        "progressImages": progress_images(source / "Pflanzenicon_Datenbank.csv"),
    }
    Path(sys.argv[2]).write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for key in ("sensor", "seriesE", "seriesS"):
        print(key, {program: len(stages) for program, stages in output[key].items()})


main()
