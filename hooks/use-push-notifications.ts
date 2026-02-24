import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(userId: string | null) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const registerPushToken = useMutation(api.notifications.registerPushToken);

  useEffect(() => {
    if (!userId) return;

    async function registerForPushNotifications() {
      if (!Device.isDevice) {
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      setExpoPushToken(token);

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      await registerPushToken({
        expoPushToken: token,
        timezone,
      });
    }

    registerForPushNotifications();
  }, [userId]);

  return { expoPushToken };
}

export async function scheduleHabitReminder(
  habitName: string,
  hour: number,
  minute: number,
) {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time for your habit!',
      body: `Don't forget: ${habitName}`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return identifier;
}

export async function scheduleMedicineReminder(
  medicineName: string,
  dosage: string,
  hour: number,
  minute: number,
) {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Medicine Reminder',
      body: `Time to take ${medicineName} (${dosage})`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return identifier;
}

export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
