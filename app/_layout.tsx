import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import {
  initializePushNotifications,
  addPushTokenListener,
  getGameUrlFromNotification,
} from "../services/notifications";

export default function RootLayout() {
  const [ogsDeviceId, setOgsDeviceId] = useState<string | null>(null);
  const notificationResponseListener =
    useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener>>();

  useEffect(() => {
    // Initialize push notifications and get device ID
    initializePushNotifications().then((deviceId) => {
      setOgsDeviceId(deviceId);
      console.log("[Layout] OGS Device ID ready:", deviceId);
    });
  }, []);

  useEffect(() => {
    if (!ogsDeviceId) return;

    // Listen for push token changes
    const tokenSub = addPushTokenListener(ogsDeviceId);

    // Handle notification taps (when user taps a notification)
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const url = getGameUrlFromNotification(response.notification);
        if (url) {
          console.log("[Layout] Notification tapped, opening URL:", url);
          // TODO: Navigate to the game URL in the WebView
          // This will be wired up when we have proper navigation to a WebView screen
        }
      });

    return () => {
      tokenSub.remove();
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, [ogsDeviceId]);

  return <Stack />;
}
