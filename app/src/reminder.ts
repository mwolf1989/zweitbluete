import * as Notifications from 'expo-notifications';

import { t } from './i18n';

const REMINDER_SECONDS = 7 * 24 * 60 * 60;

// The app only learns the garden's state while connected, so the reminder is
// simply "you have not looked for a week", restarted on every connection.
export async function scheduleReminder(): Promise<void> {
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) {
    return;
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('reminder_title'),
      body: t('reminder_body'),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: REMINDER_SECONDS,
    },
  });
}
