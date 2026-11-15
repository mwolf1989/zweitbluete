# Zweitblüte

Eine freie App für den **smartGarten** von simplePlant. Der Hersteller wurde
aufgelöst, die Original-App ist aus den Stores verschwunden, und ohne App
lassen sich Licht und Beete nicht mehr einstellen. Zweitblüte spricht direkt
per Bluetooth mit dem Gerät und braucht weder Konto noch Server.

*An open-source replacement app for the simplePlant smartGarten indoor garden,
whose vendor shut down. It talks to the device over Bluetooth LE, with no
account and no server. The app and this documentation are currently in German.*

Zweitblüte ist ein inoffizielles Community-Projekt und steht in keiner
Verbindung zur simplePlant GmbH oder ihren Rechtsnachfolgern.

## Stand

Getestet mit einem smartGarten ohne Nährstoffsensor, Firmware 1.10.0, auf iOS.

| Funktion | Stand |
|---|---|
| Garten finden und verbinden, Uhr stellen | am Gerät bestätigt |
| Wasserstand, Temperatur, Luftfeuchte mit Ampel | am Gerät bestätigt |
| Licht: Sonnenaufgang, Dauer, Helligkeit | am Gerät bestätigt |
| Licht 30 Minuten pausieren | am Gerät bestätigt |
| Beet starten, neu starten, leeren, Startdatum ändern | eingebaut, am echten Gerät noch nicht ausgelöst |
| Die acht Original-Pflanzenprogramme mit Phasen | eingebaut |
| Eigene Pflanzenpläne | eingebaut |
| Empfehlungen zu Wasser und Licht („Was ist zu tun?“) | eingebaut |
| Erinnerung nach einer Woche ohne Verbindung | eingebaut, noch nicht auf einem Gerät geprüft |
| Zuletzt verbundenen Garten automatisch wiederfinden | eingebaut, noch nicht auf einem Gerät geprüft |
| Demo-Garten ohne Gerät | eingebaut |
| Android | vorbereitet, noch nicht gebaut oder getestet |
| Nährstoffsensor (Modelle M und X) | fehlt |
| Kalibrierung, Sensorbalken-Wahl, Firmware-Update | fehlt |
| Englische Übersetzung | fehlt |

Die vollständige Gegenüberstellung mit der Original-App steht in
[docs/protocol.md](docs/protocol.md).

## Sicherheitshinweis

Der smartGarten verlangt kein Pairing. Jedes Gerät in Bluetooth-Reichweite
kann seine Werte lesen und seine Einstellungen ändern. Das liegt an der
Firmware und lässt sich von der App aus nicht ändern.

## Aufbau des Repositorys

| Ordner | Inhalt |
|---|---|
| `app/` | Die App (Expo, React Native, TypeScript) |
| `docs/protocol.md` | Das rekonstruierte Bluetooth-Protokoll und wie jeder Teil belegt ist |
| `docs/image-prompts.md` | Prompts, mit denen die Illustrationen erzeugt wurden |
| `tools/` | Python-Skripte zum Scannen, Auslesen und Testen am Gerät sowie zum Aufbereiten von Daten und Bildern |
| `captures/` | Mitschnitte der Tests am echten Gerät |
| `images/` | Die Quellbilder der Illustrationen |

## App bauen

Voraussetzungen: Node.js 20 oder neuer, für iOS Xcode und CocoaPods, für
Android das Android SDK. Bluetooth funktioniert weder in Expo Go noch im
iOS-Simulator; dort lässt sich nur der Demo-Garten nutzen.

```bash
cd app
npm install
npm test
npx expo run:ios      # Simulator, nur Demo-Garten
```

Für ein echtes iPhone die eigene Apple-Team-ID in `app/.env.local` eintragen
(`APPLE_TEAM_ID=XXXXXXXXXX`) und dann:

```bash
npx expo run:ios --device --configuration Release
```

## Werkzeuge für das Gerät

Die Skripte in `tools/` brauchen [uv](https://docs.astral.sh/uv/) und einen
Rechner mit Bluetooth. Unter macOS muss das Terminal Bluetooth nutzen dürfen.

```bash
uv run tools/ble_scan.py          # Geräte in der Nähe auflisten
uv run tools/ble_dump.py          # GATT-Tabelle lesen und Notifications mithören
uv run tools/ble_set_time.py      # Geräteuhr stellen
```

`ble_light_test.py`, `ble_light_seq.py` und `ble_snooze_test.py` schreiben auf
das Gerät und stellen danach den vorherigen Wert wieder her.

## Herkunft der Daten

- **Protokoll:** durch Auslesen eines eigenen Geräts und Analyse der zuletzt
  ausgelieferten Original-App und ihrer Firmware rekonstruiert, ausschließlich
  um das Gerät weiter nutzen zu können. Original-App und Firmware liegen nicht
  in diesem Repository.
- **Pflanzenprogramme:** `app/src/plants/programs.json` enthält die Werte der
  Pflanzen-Datenbank der Original-App (Wochen, Lichtstunden, Düngermengen,
  Grenzwerte), damit vorhandene Geräte sich wie gewohnt verhalten.
- **Illustrationen:** mit einem Bildgenerator neu erstellt; aus der
  Original-App stammen keine Grafiken.

Näheres in [NOTICE.md](NOTICE.md).

## Mitmachen

Besonders hilfreich sind Tests mit anderen Modellen (S, M, X) und anderen
Firmware-Versionen. Ein Mitschnitt von `tools/ble_dump.py` in einem Issue
reicht oft schon, um eine Lücke im Protokoll zu schließen.

## Lizenz

[GPL-3.0-or-later](LICENSE). Die Datenschutzerklärung steht in
[PRIVACY.md](PRIVACY.md).
