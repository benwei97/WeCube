import React from 'react';
import { Stack } from 'expo-router';

export default function CompetitionStack() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: '', headerShown: false }}
      />

      {/* ✅ Explicitly define route.params type */}
      <Stack.Screen
        name="[competitionId]/index"
        options={({ route }) => {
          const params = route.params as { name?: string }; // Explicitly define type
          return {
            title: params?.name ?? 'Competition Details',
            headerShown: true,
          };
        }}
      />

      <Stack.Screen
        name="[competitionId]/create-listing"
        options={{ title: 'Create Listing', headerShown: true }}
      />

      <Stack.Screen
        name="[competitionId]/[listingId]/index"
        options={{ title: 'Listing Details', headerShown: true }}
      />
    </Stack>
  );
}
