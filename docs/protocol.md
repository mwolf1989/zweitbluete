# smartGarten BLE-Protokoll – Arbeitsstand

Stand 2026-11-15. Quellen:

- **Gerät**: eigenes `smartGartenXXXXXX`, Firmware 1.10.0, Mitschnitte in `captures/`
- **Firmware**: `apk/de.simpleplant.smartgarten/assets/flutter_assets/assets/firmware/firmware.bin`
  (Version 1.10.0, identisch zur Gerätefirmware) – Log-Strings und Quelldateinamen
- **App**: `apk/config.arm64_v8a/lib/arm64-v8a/libapp.so` (Flutter/Dart AOT, App 1.11.0) –
  Klassen- und Feldnamen

Legende: **belegt** = gemessen oder eindeutig aus Firmware/App-Strings,
**Hypothese** = Byte-Layout geraten, noch nicht durch Schreiben bestätigt.

## Hardware (belegt aus Firmware-Strings)

- ESP32, Arduino-Framework über PlatformIO, Bluedroid-BLE-Stack
- Uhr: MCP7940 RTC (protokolliert Stromausfall/-rückkehr)
- Luft: ENS210 oder Würth WSEN-HIDS (Temperatur + Feuchte)
- Wasserstand: VL6180X Time-of-Flight
- Licht: PWM-Ausgang des ESP32
- TDS/EC-Sensor und Wassertemperatur: modellabhängig, über Sensor-Config schaltbar
- Einstellungen liegen im NVS-Namespace `prefs0`

## Verbindung (belegt)

- Advertising-Name `smartGarten%02X%02X%02X` (MAC-Suffix), TX-Power 3
- Service `71d7fe50-a841-4c27-9a80-5307bee17c2a`
- Kein Pairing/Bonding, Reads ohne Authentifizierung, MTU 515 mit macOS
- Original-App nutzt `flutter_reactive_ble`

## Characteristics (Basis `b954XXXX-3156-4921-a5c3-ed399d9b4433`)

Zuordnung Name ↔ UUID: Reihenfolge der Setup-Logs in
`BleSmartGartenService.cpp` plus Rechte und gelesene Werte. Für 4000–4003 und
4016 durch die Werte gut gestützt, für 400f–4015 plausibel, aber nicht bewiesen.

| XXXX | Rechte | Name (Firmware) | Gelesen am Gerät |
|---|---|---|---|
| 4000 | read | firmware | `1.10.0` (ASCII) |
| 4001 | read, write | garden info | `67 71 53 85 07 67 71 53 5f 02` |
| 4002 | read, notify | garden status | 24 Bytes, alle 5 s |
| 4003 | read, write | garden light | `05 00 03 48 ff 00 00 00 00` |
| 400f | write | time | – |
| 4010 | write, write-no-response | OTA RX | – |
| 4011 | notify | OTA status | – |
| 4012 | read, write, notify | fill height calibration | `00` |
| 4013 | read, write, notify | tds calibration | `00` |
| 4014 | read, write, notify | user tds calibration | `00` |
| 4015 | read, write | garden series | `00` |
| 4016 | read, write | sensor config | `01 02 00 00 01 01 01 00 00` |

### 4001 garden info

Firmware-Log: `Set new garden info - Start0: %i Type0: %i Start1: %i Type1: %i`,
App-Modell `SmartGartenInfo(beetOneStart, beetOneType, beetTwoStart, beetTwoType)`.

Layout (Hypothese, passt exakt auf 10 Bytes):
`uint32 BE start0 | uint8 type0 | uint32 BE start1 | uint8 type1`

- start = Unix-Zeit des Beetstarts; hier 2024-12-29 13:49:57 und 13:49:19 UTC
- type = Programm-ID aus der Pflanzen-Datenbank; hier 7 und 2

Programm-IDs (`assets/plantdb/Pflanzenprogramme_Datenbank.csv`):
1 Basilikum, 2 Kräuter, 3 Salate, 4 Gemüse, 5 Tomaten, 6 Chilis,
7 Salate und Kräuter, 255 Allgemein/Individuell.
**Schreiben** (belegt aus `BleGardenInfoService::onWrite`, Adresse `0x400e0b3c`):
genau 10 Bytes im selben Aufbau, sonst `gardenInfo request is wrong!`. Die
Firmware speichert die Werte nur und wertet sie nicht aus. Ein Zurückschreiben
des gelesenen Werts wurde am Gerät angenommen
(`captures/2026-11-15-snooze-test.txt`). Ein Schreiben mit geänderten Werten
ist am echten Gerät noch nicht ausgeführt.

„Nicht gestartet“ ist deshalb eine Konvention der App: Zweitblüte schreibt
Start 0 und Programm 0. Wie die Original-App das kodierte, ist unbekannt.

### 4002 garden status

6 × float32 Big-Endian (Format belegt). App-Modell
`SmartGartenStatus(waterLevel, airTemperature, humidity, waterTemperature, …ec…)`,
Firmware loggt in dieser Reihenfolge: water level %, air temperature,
rel. humidity %, water temperature, tds (Raw / Factory / User ppm).

| Feld | Bedeutung | Gemessen |
|---|---|---|
| 0 | Wasserstand in % (belegt): `100 × (1 − (Abstand − 38 mm) / 126 mm)`, Konstanten 3,8 cm und 12,6 cm aus dem Konstruktor des VL6180X-Treibers (`0x4018a691`) | 28,6 – 31,7, also 125–128 mm Abstand |
| 1 | Lufttemperatur °C | 16,3 – 16,4 |
| 2 | rel. Luftfeuchte % | 67 – 69 |
| 3 | Wassertemperatur °C (belegt aus der Original-App: `waterTemperature`) | 0 |
| 4 | Nährstoffwert mit Werkskalibrierung (`factoryEc`), von der App als EC in µS/cm angezeigt | 0 |
| 5 | Nährstoffwert mit Nutzerkalibrierung (`userEc`) | 0 |

Bei den ersten Messungen standen die Felder 4 und 5 auf 0, weil die Sonde bei
30 % Füllstand nicht im Wasser hing. Mit der Sonde in einem Glas Leitungswasser
(`captures/2026-11-15-probe-in-water.txt`) liefert das Gerät rund 603
(Werkskalibrierung) und 595 (Nutzerkalibrierung). **Am Gerät belegt** ist damit,
dass die Felder 4 und 5 die Nährstoffwerte sind. Feld 3 bleibt 0, passend zu
„Wassertemperatur: keiner“ in der Sensor-Config.

### 4003 garden light

Firmware-Log: `Set new light info - Start: %i:%i Duration: %i Intensity: %i Snooze: %i`,
NVS-Keys `lightStsHr`, `lightStsMin`, `lightStsDrtn`, `lightStsIntnsty`,
`lightSnzIntnsty`. App-Modell `SmartGartenLightStatus(start, duration,
lightIntensity, isSnoozing, snoozeUntil)`.

Layout (belegt, Disassembly von `BleLightStatusService::onWrite` bei
`0x400e1680` plus Schreibtests):
`uint8 Stunde | uint8 Minute | uint16 BE Dauer in Minuten | uint8 Intensität | uint32 BE snoozeUntil`

`snoozeUntil` ist ein Zeitstempel der Geräteuhr. `LightService::checkLightStatus`
(`0x400e112c`) schaltet das Licht aus, solange `jetzt < snoozeUntil`
(`Turn lights off. Reason: Snooze`); danach gilt wieder der Zeitplan, den die
Firmware über `gmtime` gegen die Geräteuhr prüft. 0 beendet die Pause. Der
Wert wird nach Ablauf nicht zurückgesetzt. Die Original-App pausierte 30 min.
Gerätetest mit 40 s Pause (`captures/2026-11-15-snooze-test-2.txt`): Lampe
ging aus und nach Ablauf von selbst wieder an, Original wiederhergestellt.
Damit am Gerät bestätigt.

Schreibtest 2026-11-15 (`captures/2026-11-15-light-test.txt`): 9 Bytes mit
Byte 4 = `0x40` wurden mit Write-with-Response angenommen und so zurückgelesen;
Originalwert danach zurückgeschrieben und verifiziert. Die Lampe war dabei aus.

Zweiter Test (`captures/2026-11-15-light-seq.txt`): `00 00 05 9f ff …`
(00:00 + 1439 min) schaltete die Lampe sofort ein, `… 40 …` an Byte 4 dimmte
sie sichtbar. **Belegt** sind damit Start (Byte 0–1), Dauer in Minuten
(Byte 2–3, BE) und Intensität (Byte 4, 0–255-Skala zumindest bis 255 gültig).
Schreiben wirkt sofort, ohne Neustart.

Mit dem Originalplan (05:00 + 14 h) war die Lampe um ca. 13 Uhr Ortszeit aus:
Die Geräteuhr geht also falsch oder ist nicht gestellt.

Aktuell: Start 05:00, 840 min (14 h), Intensität 255, Snooze 0.
Offen: ob die Original-App die Intensität als 0–255 oder in Prozent schrieb.
Firmware prüft die Länge: `lightStatus request is wrong! Size: %i`.

### 400f time

**Belegt** aus der Disassembly von `BleTimeService::onWrite` (Firmware 1.10.0,
Adresse `0x400e24f4`): Die Nachricht muss genau 4 Bytes lang sein, sonst
`Wrong format!`. Die Bytes werden als `uint32` Big-Endian zusammengesetzt und
an den Zeit-Sensor übergeben (`Set time to %i`, Unix-Zeit in Sekunden).

Offen: ob die Original-App echte UTC oder „Ortszeit als Epoch“ geschrieben
hat. Die Firmware setzt keine Zeitzone, vergleicht den Lichtplan also gegen
die Stunden/Minuten dieses Epoch-Werts. Für die eigene App reicht eine
konsistente Wahl (Empfehlung: Epoch so schreiben, dass die Geräteuhr Ortszeit
zeigt, dann sind die Zeiten in 4003 Ortszeit; bei Zeitumstellung neu setzen).
Am 2026-11-15 mit `tools/ble_set_time.py` gestellt: `6a f9 b0 ca`
(13:16:58 Ortszeit als Epoch, UTC+1), Write-with-Response ohne Fehler
(`captures/2026-11-15-set-time.txt`). Die Lampe ging danach an und folgt dem
Plan 05:00 + 14 h. **Belegt**: Zeitformat, und dass „Ortszeit als Epoch“
zusammen mit Ortszeit in 4003 funktioniert.
Die Uhr lässt sich nicht auslesen; die App hat sie vermutlich bei jeder
Verbindung neu gesetzt.

### 4010 / 4011 OTA

Firmware-Log `RX Start - OTA Size: %i MTU: %i Parts: %i`, danach Fortschritt in
Prozent, am Ende Reboot. App-Statusmeldungen: `readyForUpdate`,
`confirmDataUpload(offset)`, `installingUpdate`, `updateFinishedSuccessfully`,
`updateFinishedWithError(error)`, `timeout`.
**Nicht beschreiben**, solange das Format nicht aus dem Code gelesen ist.

### 4012–4014 Kalibrierung

- 4012 Füllstand (belegt aus der Firmware, am Gerät noch nicht ausgelöst):
  - **Auslösen:** genau ein Byte `01` schreiben
    (`BleCalibrateFillLevelService::onWrite`, `0x400e34c4`). Andere Längen oder
    Werte ergeben `calibrateFillLevel request is wrong!` und setzen den Wert auf
    `00`. Läuft schon eine Kalibrierung, wird die Anfrage abgelehnt.
  - **Verlauf:** Der Wert der Characteristic wird auf `02` gesetzt und per
    Notify gemeldet, dann startet `calibrateFillLevelTask` (`0x400e0034`). Am
    Ende ruft die Task einen Callback auf; welchen Wert er meldet, ist nicht
    gelesen. Die App wertet jede Meldung ungleich `02` als „fertig“.
  - **Was gemessen wird:** `calibrateToOffset` im VL6180X-Treiber
    (`0x4018a7a7`) setzt den Offset des Sensors zurück, mittelt 10 Messungen
    und berechnet `Offset = 38 mm − Mittelwert`. Der Offset wird als `int8` in
    mm gespeichert (NVS `fillLvlClbrtn`), danach werden die Sensoren neu
    initialisiert.
  - **Bedeutung:** Der aktuelle Wasserstand wird zu „Abstand 38 mm“ erklärt,
    also zu 100 %. Kalibriert wird deshalb bei vollem Tank. Der alte Offset
    lässt sich nicht auslesen und damit nicht wiederherstellen.
- 4013 Nährstoffsensor, Werkskalibrierung (belegt aus Firmware `0x400e3924`
  und Original-App, am Gerät noch nicht ausgelöst):
  - **Auslösen:** 5 Bytes, `01` gefolgt vom Zielwert als float32 Big-Endian.
    Die Firmware berechnet daraus einen k-Faktor.
  - **Original-App:** schreibt 1450 (`01 44 b5 40 00`), gedacht für eine
    Referenzlösung mit 1450 µS/cm, und nur ab Firmware 1.2.
- 4014 Nährstoffsensor, Nutzerkalibrierung (Firmware `0x400e3dc8`):
  - **Setzen:** wie 4013, 5 Bytes mit `01` und Zielwert.
  - **Zurücksetzen:** ein einzelnes Byte `03`.
  - **Original-App:** schreibt beim Start eines Beets 530 (`01 44 04 80 00`)
    und erklärt damit das vorhandene Wasser zum Ausgangswert; beim Zurücksetzen
    eines Beets schreibt sie `03`. Nur ab Firmware 1.6. Liegt der Werkswert vor
    dem Start schon bei 530 oder mehr, warnt sie vor hartem Wasser.
- Zustand aller drei Kalibrierungen: Byte 0 = `00` heißt bereit, jeder andere
  Wert heißt, dass die Kalibrierung läuft (Original-App).

### 4015 garden series

Ein Byte, Baureihe (belegt aus der Original-App, `generate_garden_series.dart`):

| Wert | Name in der App | Pflanzen-Datenbank |
|---|---|---|
| 0 | `Standard_X` | Sensor-Variante mit EC- und Füllstand-Grenzwerten |
| 1 | `S` | feste Düngermengen je Phase, kleiner Tank |
| 2 | `E` | feste Düngermengen je Phase, großer Tank |

Das Testgerät meldet `00`. Zweitblüte liest den Wert bei jeder Verbindung und
wählt danach die Düngertabelle; schreiben tut die App ihn nicht.

### 4016 sensor config

Firmware-Log: `TimeSensorType:%d AirTemperatureHumiditySensorType:%d
WaterTemperatureSensorType:%d TdsSensorType:%d WaterLevelSensorType:%d
LightSensorType:%d`. Schreiben löst einen Neustart-Hinweis aus
(`SENSOR CONFIG CHANGED! RESTART REQUIRED!`).

**Layout (belegt):** 9 Bytes, sonst `Sensor config request is wrong!`
(`BleSensorConfigService::onWrite`, `0x400e2210`). Die Firmware loggt und
speichert (`setSensorConfiguration`, `0x400df38c`) diese Offsets:

| Byte | Bedeutung | NVS-Schlüssel |
|---|---|---|
| 0 | Uhr | `snsrtmecnfg` |
| 1 | Lufttemperatur/-feuchte | `snsrairthcnfg` |
| 2 | von Firmware 1.10.0 nicht verwendet | – |
| 3 | Wassertemperatur | `snsrwtrtempcnfg` |
| 4 | TDS | `snsrtdscnfg` |
| 5 | Wasserstand | `snsrwtrlvlcnfg` |
| 6 | Licht | `snsrlghtcnfg` |
| 7, 8 | von Firmware 1.10.0 nicht verwendet | – |

Hier `01 02 00 00 01 01 01 00 00`: Uhr 1, Luft 2, Wassertemperatur 0 (keiner),
TDS 1, Wasserstand 1, Licht 1. Eine frühere Fassung dieser Datei las die Bytes
fortlaufend und kam so fälschlich auf „kein TDS-Sensor“.

**Typen (belegt aus der Original-App, mit blutter dekompiliert):** Jedes Byte
ist der Index eines Enums.

| Sensor | 0 | 1 | 2 |
|---|---|---|---|
| Uhr | None | MCP7940 | – |
| Lufttemperatur/-feuchte | None | ENS210 | WSEN_HIDS |
| Wassertemperatur | None | – | – |
| TDS | None | AnalogTdsMeter | – |
| Wasserstand | None | VL6180 | – |
| Licht | None | PwmLightSensor | – |

**Sensorbalken-Wahl der Original-App** (`sensor_config_page.dart`,
`helper/localizations.dart`): Zur Auswahl standen zwei feste Konfigurationen,
die sich nur im Luftsensor unterscheiden.

| Stufe | Bytes | Unterschied |
|---|---|---|
| v1 | `01 01 00 00 01 01 01 00 00` | Luftsensor ENS210 |
| v2 | `01 02 00 00 01 01 01 00 00` | Luftsensor WSEN-HIDS |
| „Kein Sensorbalken“ | `00 00 00 00 00 00 00 00 00` | Anzeige, wenn alle Typen None sind; nicht wählbar |

Jede andere Kombination zeigte die App als v1 an. Das Testgerät steht auf v2.
Das Schreiben ist am Gerät noch nicht ausgelöst; die Firmware verlangt danach
einen Neustart (`SENSOR CONFIG CHANGED! RESTART REQUIRED!`).

## Pflanzen-Datenbank (aus der App, gebündelt)

`apk/de.simpleplant.smartgarten/assets/flutter_assets/assets/plantdb/`

- `Pflanzenprogramme_Datenbank.csv` – je Programm und Woche: EC-, Wasser-,
  Temperatur-, Feuchte-Bereiche (rot/gelb/grün), Sollwerte, Lichtstunden
- `Pflanzenprogramme_Datenbank_S.csv`, `_E.csv` – vereinfachte Serien ohne
  EC-Sensor: Düngen pro Woche/pro Gießen, Wasser-Wert, Lichtstunden
- `Pflanzenicon_Datenbank.csv` – Fortschritts-Icon je Programm und Woche
- `assets/translations/de.json`, `en.json` – alle App-Texte

Die gesamte Auswertung (Ampel, Erinnerungen, Lichtempfehlung) lief in der App,
nicht im Gerät. Kein Konto, kein Server nötig.

Für die neue App extrahiert `tools/extract_plantdb.py` die drei Programm-CSVs
nach `app/src/plants/programs.json` (8 Programme; Serien S und E mit Phasen
keimung/wachstum/ernte und Düngermengen; Sensor-Variante mit Grenzwerten für
EC, Wasser, Temperatur, Feuchte). Grafiken werden nicht übernommen.
Quell-Eigenheit: Chilis listet Woche 10 doppelt (`8,9,10,10,11`), wird einmal
gezählt. Annahme: die Wasser-Prozentwerte der Datenbank sind direkt mit dem
Wasserstand aus 4002 vergleichbar.

## Empfehlungen der Original-App (aus dem dekompilierten Code)

Mit blutter aus `libapp.so` gelesen; die Dateinamen beziehen sich auf
`features/status/usecases/` der Original-App.

- **Wasser** (`calculate_water_missing.dart`):
  `Liter = (Soll − max(Ist, 0,1)) × 7,8`, Soll und Ist als Anteil von 1.
  Negativ heißt: Wasser entnehmen.
- **Dünger** (`calculate_nutrition_missing.dart`):
  `Löffel = (EC-Soll − EC-Ist + 20) × Füllstand / Teiler`, Füllstand als Anteil
  (höchstens 1). Teiler: 255 ab 90 % Füllstand, 320 ab 80 %, 435 ab 60 %,
  sonst 665. Negativ heißt: Nährlösung zu stark.
- **Welcher EC-Wert:** die Nutzerkalibrierung, wenn sie über 0 liegt, sonst die
  Werkskalibrierung (`calculate_ec_beetsensor_status.dart`).
- **Welches Beet:** bei zwei Beeten das mit dem niedrigeren EC-Soll.
- **Dringlichkeit** (`generate_nutrition_status.dart`): grüner Bereich keine
  Meldung, gelber „bald“, roter „schnellstmöglich“; die Menge mit einer
  Nachkommastelle. Stehen Wasser und Dünger an, kommt Wasser zuerst.

Zweitblüte rechnet mit denselben Formeln, rundet Liter aber auf halbe Liter.

## Aus der Netzrecherche

- App und Firmware von BRICKMAKERS (Koblenz); Eigenentwicklung, kein OEM-Gerät.
  <https://www.brickmakers.de/referenzen/simple-plant>
- App-ID `de.simpleplant.smartgarten`, iOS-Store-ID 1584939818
- XAPK 1.11.0 von APKPure, SHA1 `47b6b0523eb1e45f395c9b3a17f27cd25d22e715`
  (stimmt mit der dort angegebenen Prüfsumme überein)
- simplePlant GmbH (HRB 167764 Hamburg): Liquidation 13.06.2024, Löschung
  20.01.2026 laut North Data
- Kein öffentliches Reverse Engineering gefunden

## Offene Punkte

1. Beet starten und Snooze aus der App heraus am echten Gerät prüfen.
2. Intensitäts-Skala der Original-App (0–255 oder Prozent).
3. Kodierung „Beet nicht gestartet“ in 4001, Serien-Werte in 4015, letzte drei
   Bytes in 4016, Snooze-Bytes in 4003.
4. OTA-Protokoll nur bei Bedarf; die Gerätefirmware ist bereits die letzte Version.

## Werkzeuge

- `uv run tools/ble_scan.py [sek] [name]` – Advertiser auflisten
- `uv run tools/ble_dump.py [prefix] [sek]` – GATT-Tabelle, Reads, Notifications
- `uv run tools/ble_poll.py [runden] [intervall]` – Reads wiederholen, Änderungen zeigen

Unter macOS aus dem Terminal-Panel bzw. einem Terminal mit Bluetooth-Freigabe
starten; aus der sandboxed Shell bricht CoreBluetooth mit SIGABRT ab.

## Funktionsumfang der Original-App und Stand in Zweitblüte

Aus App-Texten (`assets/translations/de.json`), Bloc-Ereignissen in `libapp.so`
und den Firmware-Diensten. Stand 2026-11-15.

| Funktion der Original-App | Characteristic | Zweitblüte |
|---|---|---|
| Suchen, verbinden, Uhr stellen | 400f | vorhanden |
| Sensorwerte mit Ampel | 4002 | vorhanden (Wasser, Temperatur, Feuchte) |
| Licht: Start, Dauer, Helligkeit | 4003 | vorhanden |
| Licht 30 min pausieren (Snooze) | 4003 Byte 5–8 | vorhanden |
| Warnung bei sehr niedriger Helligkeit | – | vorhanden (Hinweis in „Was ist zu tun?“) |
| Beet starten / von vorn starten, Programmwahl | 4001 | vorhanden, am echten Gerät noch nicht ausgelöst |
| Beet-Startdatum nachträglich ändern | 4001 | vorhanden, am echten Gerät noch nicht ausgelöst |
| „Was soll ich machen?“: Liter nachgießen/entnehmen, Löffel düngen | 4002 | vorhanden, mit den Formeln der Original-App; Dünger aus dem EC-Wert, ohne Messwert nach Phase |
| Wasserhinweise je Phase für S/E (simpleCups feucht usw.) | – | vorhanden, eigene Texte |
| EC/Nährlösung anzeigen (M, X) | 4002 Feld 4–5 | vorhanden, mit Düngerempfehlung; mit echtem Messwert am Gerät ungeprüft |
| Sensorbalken wählen (keiner / v1 / v2) | 4016 | vorhanden, am echten Gerät noch nicht ausgelöst |
| Nährstoffsensor kalibrieren (Werk/Nutzer) | 4013, 4014 | vorhanden, am echten Gerät noch nicht ausgelöst |
| Füllstand kalibrieren | 4012 | vorhanden, am echten Gerät noch nicht ausgelöst |
| Firmware-Update | 4010, 4011 | fehlt; `firmware.bin` 1.10.0 liegt vor |
| Erinnerungs-Benachrichtigung | – | vorhanden: eine Woche nach der letzten Verbindung |
| Tipps & Tricks (Aufbau, Pflege, FAQ, Handbuch) | – | fehlt; Inhalte lagen online auf simpleplant.de, nicht in der APK |
| Fortschritts-Icons je Programm und Woche | – | fehlt; eigene Bilder geplant |
| Englische Übersetzung | – | vorhanden (`app/src/i18n.ts`) |
| Demo-Garten | – | vorhanden |
| Eigene Pläne | – | neu in Zweitblüte |

In der APK liegen von den Tipps nur die vier URLs
(`simpleplant.de/pages/aufbau`, `/pflege-hinweise`, `/faq`, `/manual`); als
Dokument ist nur `Impressum&DSGVO.pdf` gebündelt.
