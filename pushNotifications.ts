// pushNotifications.ts
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token: string | undefined;
  
  // Log both device checks for debugging:
  console.log("Constants.isDevice:", Constants.isDevice);
  console.log("Device.isDevice:", Device.isDevice);

  // Use Device.isDevice as the primary check:
  if (Device.isDevice) {
    // Check current permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log("Existing notification permission status:", existingStatus);
    let finalStatus = existingStatus;
    // If permissions not granted, request them
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      console.log("Requested permission, new status:", status);
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notifications!');
      console.log("Notification permission not granted. Final status:", finalStatus);
      return;
    }
    // Get the token from Expo's push notification service
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);
  } else {
    alert('Must use a physical device for Push Notifications');
    console.log("Device.isDevice is false. Not a physical device.");
  }

  // Android-specific: set up a notification channel
  if (Platform.OS === 'android') {
    console.log("Setting up Android notification channel...");
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}
