// German and English texts. The app sets the language once at startup from the
// phone's preferred language (see deviceLanguage.ts): German for German,
// English for everything else.

export type Language = 'de' | 'en';

const de = {
  // Scan screen
  scan_no_permission:
    'Ohne Bluetooth-Berechtigung kann die App deinen smartGarten nicht finden. Erlaube sie in den Einstellungen.',
  scan_bluetooth_off: 'Bluetooth ist ausgeschaltet. Schalte es ein, um deinen smartGarten zu finden.',
  scan_connecting: 'Verbinde mit {name} …',
  scan_nothing_found:
    'Noch kein smartGarten gefunden. Ist er eingeschaltet und in der Nähe? Er lässt nur eine Verbindung zu, also darf kein anderes Gerät mit ihm verbunden sein.',
  scan_searching: 'Suche nach smartGärten in der Nähe …',
  scan_tap_to_connect: 'Tippe auf deinen smartGarten, um ihn zu verbinden.',
  connect: 'Verbinden',
  demo_show: 'Demo-Garten ansehen',
  demo_name: 'Demo-Garten',

  // Garden screen
  disconnect: 'Trennen',
  tile_water: 'Wasserstand',
  tile_temperature: 'Temperatur',
  tile_humidity: 'Luftfeuchte',
  level_green: 'gut',
  level_yellow: 'grenzwertig',
  level_red: 'kritisch',
  advice_title: 'Was ist zu tun?',
  advice_no_beds: 'Starte ein Beet, dann bekommst du hier Empfehlungen zu Wasser und Licht.',
  advice_nothing: 'Im Moment ist nichts zu tun.',
  light_title: 'Licht',
  light_paused: 'Pausiert',
  light_on: 'An',
  light_off: 'Aus',
  sunrise: 'Sonnenaufgang',
  duration: 'Dauer',
  brightness: 'Helligkeit',
  sunset: 'Sonnenuntergang um {time} Uhr.',
  save: 'Speichern',
  saving: 'Speichere …',
  snooze_start: 'Licht 30 min pausieren',
  snooze_end: 'Pause beenden',
  beds_title: 'Beete',
  bed: 'Beet {number}',
  bed_with_plan: 'Beet {number}: {plan}',
  not_started: 'Nicht gestartet',
  start: 'Starten',
  week_and_phase: 'Woche {week} · {phase}',
  started_on: 'Gestartet am',
  change_plan: 'Plan ändern',
  restart: 'Neu starten',
  restart_message:
    'Neu starten setzt das Beet auf Woche 1 zurück. Leeren markiert es als nicht bepflanzt.',
  empty_bed: 'Leeren',
  cancel: 'Abbrechen',
  sensor_title: 'Sensoren',
  sensor_bar: 'Sensorbalken',
  sensor_bar_none: 'Kein Sensorbalken eingestellt.',
  sensor_bar_other: 'Eigene Sensor-Einstellung, weder v1 noch v2.',
  sensor_bar_change: 'Sensorbalken {bar} einstellen?',
  sensor_bar_change_message:
    'Eine falsche Einstellung kann dazu führen, dass dein Garten keine Werte mehr misst. Nach der Umstellung muss der Garten neu gestartet werden: Stecker ziehen und wieder einstecken.',
  sensor_bar_confirm: 'Umstellen',
  sensor_bar_changed: 'Umgestellt. Starte den Garten jetzt neu.',
  ec_value: 'Nährlösung: {value} µS/cm',
  ec_missing: 'Der Nährstoffsensor liefert keinen Wert. Hängt die Sonde im Wasser?',
  sensor_distance:
    'Der Sensor misst etwa {distance} cm bis zur Wasseroberfläche. Bei vollem Tank sind es {full} cm.',
  sensor_no_reading: 'Noch kein Messwert.',
  calibrate: 'Füllstand kalibrieren',
  calibrate_message:
    'Fülle den Tank vorher ganz auf, bis die Anzuchttöpfe etwa 3 mm ins Wasser tauchen. Der Garten übernimmt diesen Stand als 100 %. Das ersetzt die bisherige Kalibrierung und lässt sich nur durch erneutes Kalibrieren ändern.',
  calibrate_confirm: 'Tank ist voll, kalibrieren',
  calibration_running: 'Kalibriere …',
  calibration_done: 'Kalibrierung abgeschlossen. Der Wasserstand sollte jetzt bei etwa 100 % liegen.',
  calibration_failed: 'Die Kalibrierung hat nicht geantwortet. Bitte versuch es noch einmal.',
  calibrate_nutrient: 'Nährstoffsensor kalibrieren',
  calibrate_nutrient_message:
    'Stelle die Sonde vorher in eine Referenzlösung mit {ec} µS/cm. Der Garten übernimmt den Messwert als diesen Wert. Das ersetzt die bisherige Kalibrierung und lässt sich nur durch erneutes Kalibrieren ändern.',
  calibrate_nutrient_confirm: 'Sonde ist in der Lösung, kalibrieren',
  nutrient_calibration_running: 'Kalibriere den Nährstoffsensor …',
  nutrient_calibration_done: 'Nährstoffsensor kalibriert.',
  nutrient_calibration_failed: 'Die Kalibrierung hat nicht geantwortet. Bitte versuch es noch einmal.',
  hard_water_title: 'Dein Wasser ist ziemlich hart',
  hard_water_message:
    'Es hat schon ohne Dünger einen hohen Nährstoffwert. Das kann das Wachstum bremsen. Regenwasser, stilles Mineralwasser oder gefiltertes Wasser eignen sich besser.',
  hard_water_confirm: 'Trotzdem starten',
  decrease: 'verringern',
  increase: 'erhöhen',

  // Plans
  back: 'Zurück',
  plan_for_bed: 'Plan für Beet {number}',
  start_bed: 'Beet {number} starten',
  start_bed_note: 'Wähle einen Plan. Das Beet beginnt damit heute in Woche 1.',
  your_model: 'Dein Modell',
  model_note: '{name}: {description}. Die Düngermengen der mitgelieferten Pläne richten sich nach der Tankgröße.',
  model_S: '3,5 l Wassertank, 3 Pflanzen',
  model_E: '7 l Wassertank, 6 Pflanzen',
  model_M: '7 l Wassertank, 6 Pflanzen, Nährstoffsensor',
  model_X: '7 l Wassertank, 6 Pflanzen, höhenverstellbar',
  plan_summary: '{weeks} · {phases}',
  custom_plan_summary: 'Eigener Plan · {summary}',
  edit: 'Bearbeiten',
  create_plan: 'Eigenen Plan anlegen',
  weeks_one: '{count} Woche',
  weeks_other: '{count} Wochen',
  phase_keimung: 'Keimung',
  phase_wachstum: 'Wachstum',
  phase_ernte: 'Ernte',
  program_1: 'Basilikum',
  program_2: 'Kräuter',
  program_3: 'Salate',
  program_4: 'Gemüse',
  program_5: 'Tomaten',
  program_6: 'Chilis',
  program_7: 'Salate und Kräuter',
  program_255: 'Allgemein',
  default_plan_name: 'Mein Plan',

  // Plan editor
  delete: 'Löschen',
  new_plan: 'Neuer Plan',
  edit_plan: 'Plan bearbeiten',
  plan_name: 'Name des Plans',
  editor_summary_one:
    '{count} Abschnitt, zusammen {weeks}. Nach dem letzten Abschnitt gelten dessen Werte weiter.',
  editor_summary_other:
    '{count} Abschnitte, zusammen {weeks}. Nach dem letzten Abschnitt gelten dessen Werte weiter.',
  section: 'Abschnitt {number}',
  remove: 'Entfernen',
  light_per_day: 'Licht pro Tag',
  fertiliser_per_week: 'Dünger pro Woche',
  fertiliser_per_litre: 'Dünger pro Liter',
  unit_weeks: '{value} Wo.',
  unit_hours: '{value} h',
  spoons_one: '{value} Löffel',
  spoons_other: '{value} Löffel',
  add_section: 'Abschnitt hinzufügen',
  save_plan: 'Plan speichern',

  // Advice
  fertiliser_none: 'Kein Dünger nötig',
  fertiliser_add_soon: 'Dünge bald mit etwa {amount}.',
  fertiliser_add_now: 'Dünge möglichst bald mit etwa {amount}.',
  fertiliser_too_much: 'Die Nährlösung ist zu stark. Ersetze einige Liter durch Leitungswasser.',
  water_before_fertiliser: 'Kümmere dich zuerst um das Wasser, danach um den Dünger.',
  fertiliser_this_week: 'Diese Woche {amount} Dünger',
  fertiliser_per_refill: 'Beim Nachgießen {amount} Dünger pro Liter',
  water_keimung: 'Halte die Anzuchttöpfe feucht, bis die Wurzeln ins Wasser reichen.',
  water_wachstum: 'Die Wurzeln sollen dauerhaft im Wasser hängen, die Töpfe selbst nicht mehr.',
  water_ernte: 'Lass unter den Töpfen etwa 2 cm Luft.',
  water_add_soon: 'Gieße bald etwa {amount} Wasser nach.',
  water_add_now: 'Gieße möglichst bald etwa {amount} Wasser nach.',
  water_remove_soon: 'Entnimm bald etwa {amount} Wasser.',
  water_remove_now: 'Entnimm möglichst bald etwa {amount} Wasser.',
  litres_one: '{value} Liter',
  litres_other: '{value} Liter',
  light_duration_differs:
    'Für deine Pflanzen sind {recommended} h Licht pro Tag empfohlen, eingestellt sind {set} h.',
  light_too_dim: 'Die Helligkeit ist sehr niedrig eingestellt. Das kann das Wachstum bremsen.',

  // Reminder
  reminder_title: 'Dein Garten braucht einen Blick',
  reminder_body: 'Verbinde dich und schau nach Wasser, Dünger und Licht.',
};

type Key = keyof typeof de;

const en: Record<Key, string> = {
  scan_no_permission:
    'Without Bluetooth permission the app cannot find your smartGarten. Allow it in Settings.',
  scan_bluetooth_off: 'Bluetooth is off. Turn it on to find your smartGarten.',
  scan_connecting: 'Connecting to {name} …',
  scan_nothing_found:
    'No smartGarten found yet. Is it switched on and nearby? It accepts only one connection, so no other device may be connected to it.',
  scan_searching: 'Looking for smartGarten devices nearby …',
  scan_tap_to_connect: 'Tap your smartGarten to connect.',
  connect: 'Connect',
  demo_show: 'Try the demo garden',
  demo_name: 'Demo garden',

  disconnect: 'Disconnect',
  tile_water: 'Water level',
  tile_temperature: 'Temperature',
  tile_humidity: 'Humidity',
  level_green: 'good',
  level_yellow: 'borderline',
  level_red: 'critical',
  advice_title: 'What needs doing?',
  advice_no_beds: 'Start a bed to get advice on water and light here.',
  advice_nothing: 'Nothing needs doing right now.',
  light_title: 'Light',
  light_paused: 'Paused',
  light_on: 'On',
  light_off: 'Off',
  sunrise: 'Sunrise',
  duration: 'Duration',
  brightness: 'Brightness',
  sunset: 'Sunset at {time}.',
  save: 'Save',
  saving: 'Saving …',
  snooze_start: 'Pause light for 30 min',
  snooze_end: 'End pause',
  beds_title: 'Beds',
  bed: 'Bed {number}',
  bed_with_plan: 'Bed {number}: {plan}',
  not_started: 'Not started',
  start: 'Start',
  week_and_phase: 'Week {week} · {phase}',
  started_on: 'Started on',
  change_plan: 'Change plan',
  restart: 'Restart',
  restart_message: 'Restart puts the bed back to week 1. Empty marks it as not planted.',
  empty_bed: 'Empty',
  cancel: 'Cancel',
  sensor_title: 'Sensors',
  sensor_bar: 'Sensor bar',
  sensor_bar_none: 'No sensor bar is set.',
  sensor_bar_other: 'Custom sensor setting, neither v1 nor v2.',
  sensor_bar_change: 'Set sensor bar {bar}?',
  sensor_bar_change_message:
    'A wrong setting can stop your garden from measuring anything. After the change the garden has to be restarted: unplug it and plug it back in.',
  sensor_bar_confirm: 'Change',
  sensor_bar_changed: 'Changed. Restart the garden now.',
  ec_value: 'Nutrient solution: {value} µS/cm',
  ec_missing: 'The nutrient sensor reports no value. Is the probe in the water?',
  sensor_distance:
    'The sensor measures about {distance} cm to the water surface. With a full tank it is {full} cm.',
  sensor_no_reading: 'No reading yet.',
  calibrate: 'Calibrate water level',
  calibrate_message:
    'Fill the tank completely first, until the seedling cups dip about 3 mm into the water. The garden takes this level as 100 %. This replaces the current calibration and can only be changed by calibrating again.',
  calibrate_confirm: 'Tank is full, calibrate',
  calibration_running: 'Calibrating …',
  calibration_done: 'Calibration finished. The water level should now read about 100 %.',
  calibration_failed: 'The calibration did not respond. Please try again.',
  calibrate_nutrient: 'Calibrate nutrient sensor',
  calibrate_nutrient_message:
    'Put the probe into a reference solution of {ec} µS/cm first. The garden takes the reading as that value. This replaces the current calibration and can only be changed by calibrating again.',
  calibrate_nutrient_confirm: 'Probe is in the solution, calibrate',
  nutrient_calibration_running: 'Calibrating the nutrient sensor …',
  nutrient_calibration_done: 'Nutrient sensor calibrated.',
  nutrient_calibration_failed: 'The calibration did not respond. Please try again.',
  hard_water_title: 'Your water is rather hard',
  hard_water_message:
    'It already has a high nutrient value without fertiliser. That can slow growth. Rain water, still mineral water or filtered water work better.',
  hard_water_confirm: 'Start anyway',
  decrease: 'decrease',
  increase: 'increase',

  back: 'Back',
  plan_for_bed: 'Plan for bed {number}',
  start_bed: 'Start bed {number}',
  start_bed_note: 'Choose a plan. The bed starts with it today in week 1.',
  your_model: 'Your model',
  model_note: '{name}: {description}. The fertiliser amounts of the built-in plans depend on the tank size.',
  model_S: '3.5 l water tank, 3 plants',
  model_E: '7 l water tank, 6 plants',
  model_M: '7 l water tank, 6 plants, nutrient sensor',
  model_X: '7 l water tank, 6 plants, height-adjustable',
  plan_summary: '{weeks} · {phases}',
  custom_plan_summary: 'Custom plan · {summary}',
  edit: 'Edit',
  create_plan: 'Create your own plan',
  weeks_one: '{count} week',
  weeks_other: '{count} weeks',
  phase_keimung: 'Germination',
  phase_wachstum: 'Growth',
  phase_ernte: 'Harvest',
  program_1: 'Basil',
  program_2: 'Herbs',
  program_3: 'Lettuce',
  program_4: 'Vegetables',
  program_5: 'Tomatoes',
  program_6: 'Chilies',
  program_7: 'Lettuce and herbs',
  program_255: 'General',
  default_plan_name: 'My plan',

  delete: 'Delete',
  new_plan: 'New plan',
  edit_plan: 'Edit plan',
  plan_name: 'Plan name',
  editor_summary_one: '{count} section, {weeks} in total. After the last section its values keep applying.',
  editor_summary_other:
    '{count} sections, {weeks} in total. After the last section its values keep applying.',
  section: 'Section {number}',
  remove: 'Remove',
  light_per_day: 'Light per day',
  fertiliser_per_week: 'Fertiliser per week',
  fertiliser_per_litre: 'Fertiliser per litre',
  unit_weeks: '{value} wk',
  unit_hours: '{value} h',
  spoons_one: '{value} spoon',
  spoons_other: '{value} spoons',
  add_section: 'Add section',
  save_plan: 'Save plan',

  fertiliser_none: 'No fertiliser needed',
  fertiliser_add_soon: 'Add about {amount} of fertiliser soon.',
  fertiliser_add_now: 'Add about {amount} of fertiliser as soon as possible.',
  fertiliser_too_much: 'The nutrient solution is too strong. Replace a few litres with tap water.',
  water_before_fertiliser: 'Deal with the water first, then with the fertiliser.',
  fertiliser_this_week: '{amount} of fertiliser this week',
  fertiliser_per_refill: '{amount} of fertiliser per litre when topping up',
  water_keimung: 'Keep the seedling cups moist until the roots reach the water.',
  water_wachstum: 'The roots should hang in the water at all times, the cups themselves no longer.',
  water_ernte: 'Leave about 2 cm of air below the cups.',
  water_add_soon: 'Add about {amount} of water soon.',
  water_add_now: 'Add about {amount} of water as soon as possible.',
  water_remove_soon: 'Remove about {amount} of water soon.',
  water_remove_now: 'Remove about {amount} of water as soon as possible.',
  litres_one: '{value} litre',
  litres_other: '{value} litres',
  light_duration_differs:
    'Your plants should get {recommended} h of light per day, {set} h are set.',
  light_too_dim: 'The brightness is set very low. That can slow growth.',

  reminder_title: 'Your garden needs a look',
  reminder_body: 'Connect and check water, fertiliser and light.',
};

const texts: Record<Language, Record<Key, string>> = { de, en };

let language: Language = 'en';

export function getLanguage(): Language {
  return language;
}

export function setLanguage(next: Language): void {
  language = next;
}

export function locale(): string {
  return language === 'de' ? 'de-DE' : 'en-GB';
}

export function t(key: Key, values: Record<string, string | number> = {}): string {
  return texts[language][key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));
}

// Numbers use a decimal comma in German and a point in English.
export function decimal(value: number, fractionDigits?: number): string {
  const text = fractionDigits === undefined ? String(value) : value.toFixed(fractionDigits);
  return language === 'de' ? text.replace('.', ',') : text;
}

function counted(one: Key, other: Key, value: number, name: 'count' | 'value'): string {
  return t(value === 1 ? one : other, { [name]: decimal(value) });
}

export const weeks = (count: number) => counted('weeks_one', 'weeks_other', count, 'count');
export const litres = (value: number) => counted('litres_one', 'litres_other', value, 'value');
export const spoons = (value: number) => counted('spoons_one', 'spoons_other', value, 'value');
