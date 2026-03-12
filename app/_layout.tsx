import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import {
  initializePushNotifications,
  addPushTokenListener,
  getGameUrlFromNotification,
} from "../services/notifications";
import {
  getInitialGameUrl,
  addDeepLinkListener,
} from "../services/deep-links";
import { setGameUrl } from "../services/game-url-store";

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

  // Handle deep links (Universal Links and custom scheme)
  useEffect(() => {
    // Check if the app was launched with a URL (cold start)
    getInitialGameUrl().then((gameUrl) => {
      if (gameUrl) {
        console.log("[Layout] App launched with game URL:", gameUrl);
        setGameUrl(gameUrl);
      }
    });

    // Listen for incoming URLs while the app is running (warm start)
    const sub = addDeepLinkListener((gameUrl) => {
      console.log("[Layout] Deep link received, opening URL:", gameUrl);
      setGameUrl(gameUrl);
    });

    return () => sub.remove();
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
          setGameUrl(url);
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
