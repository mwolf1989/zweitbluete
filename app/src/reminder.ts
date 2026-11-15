import * as Notifications from 'expo-notifications';

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
      title: 'Dein Garten braucht einen Blick',
      body: 'Verbinde dich und schau nach Wasser, Dünger und Licht.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: REMINDER_SECONDS,
    },
  });
}
