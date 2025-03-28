import React from 'react';
import { Stack } from 'expo-router';

export default function MessagesStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '', headerShown: false }} />
      <Stack.Screen name="[messageId]/index" options={{ title: '', headerShown: true }} />
    </Stack>
  );
}