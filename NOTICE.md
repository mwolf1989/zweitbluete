# Hinweise

## Marken

„smartGarten“ und „simplePlant“ sind Bezeichnungen der aufgelösten
simplePlant GmbH, Hamburg. Sie werden hier nur verwendet, um zu beschreiben,
mit welchem Gerät die App zusammenarbeitet. Zweitblüte ist ein inoffizielles
Community-Projekt ohne Verbindung zum Hersteller, zu seinen Rechtsnachfolgern
oder zu den Entwicklern der Original-App.

## Was nicht in diesem Repository liegt

Die Original-App (Android-Paket `de.simpleplant.smartgarten`, Version 1.11.0)
und die darin enthaltene Geräte-Firmware 1.10.0 werden nicht mitveröffentlicht.
`docs/protocol.md` beschreibt, was aus beiden über das Bluetooth-Protokoll
abgelesen wurde, und nennt Adressen in der Firmware, an denen sich die
Befunde nachprüfen lassen. Zweck der Analyse war allein, die Kommunikation mit
bereits gekauften Geräten wieder zu ermöglichen.

## Pflanzenprogramme

`app/src/plants/programs.json` wurde mit `tools/extract_plantdb.py` aus den
CSV-Dateien der Original-App erzeugt. Die Datei enthält deren Zahlenwerte:
Wochen, Phasen, Lichtstunden, Düngermengen und Grenzwerte für die acht
Programme. Sie ist enthalten, damit vorhandene Gärten dieselben Empfehlungen
bekommen wie zuvor. Wer Rechte an diesen Daten hält und sie hier nicht sehen
möchte, kann ein Issue öffnen; die App funktioniert auch mit eigenen Plänen.

## Illustrationen

Die Bilder in `images/` und `app/assets/` wurden mit einem KI-Bildgenerator
anhand der Prompts in `docs/image-prompts.md` erzeugt und mit
`tools/prepare_images.py` aufbereitet.

## Fremde Software

Die App wurde aus der Expo-Vorlage `blank-typescript` erzeugt (MIT-Lizenz,
650 Industries, Inc.) und nutzt unter anderem Expo, React Native,
`react-native-ble-plx` und `@react-native-async-storage/async-storage`. Die
vollständige Liste mit Versionen steht in `app/package.json`; die Lizenzen
liegen den jeweiligen Paketen bei.
