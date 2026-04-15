import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
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
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription>(null);

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
          sound: 'notification.wav',
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

    // Listen for notification taps and navigate to the right screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const screen = response.notification.request.content.data?.screen;
        if (screen === 'medicines') {
          router.push('/(tabs)/medicines');
        }
      }
    );

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
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
      sound: 'notification.wav',
      data: { screen: 'habits' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return identifier;
}

/**
 * Schedule a single grouped notification for multiple medicines at the same time.
 * Call this once per unique time slot, passing all meds due at that time.
 */
export async function scheduleMedicineReminders(
  medicines: { name: string; dosage: string }[],
  hour: number,
  minute: number,
) {
  if (medicines.length === 0) return;

  const body = medicines.length === 1
    ? `Time to take ${medicines[0].name} (${medicines[0].dosage})`
    : medicines.map((m) => `${m.name} (${m.dosage})`).join('\n');

  const title = medicines.length === 1
    ? 'Medicine Reminder'
    : `Medicine Reminder — ${medicines.length} medications`;

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'notification.wav',
      data: { screen: 'medicines' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return identifier;
}

// Keep single-medicine version for backward compat
export async function scheduleMedicineReminder(
  medicineName: string,
  dosage: string,
  hour: number,
  minute: number,
) {
  return scheduleMedicineReminders([{ name: medicineName, dosage }], hour, minute);
}

export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
