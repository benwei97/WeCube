import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase'; // Adjust the path to your firebase config
import { MaterialIcons, FontAwesome } from '@expo/vector-icons'; // Importing icons for tabs

export default function MyTabs() {
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread messages count for the current user from the messages collection
  useEffect(() => {
    const fetchUnreadMessages = () => {
      if (!auth.currentUser) return;

      const q = query(
        collection(db, 'messages'),
        where('recipientId', '==', auth.currentUser.uid),
        where('isRead', '==', false)  // Only count unread messages
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadCount(snapshot.size);  // Count the number of unread messages
      });

      return () => unsubscribe();
    };

    fetchUnreadMessages();
  }, []);

  return (
    <Tabs>
      {/* Competitions Tab with a Trophy Icon */}
      <Tabs.Screen
        name="competitions"
        options={{
          title: 'Competitions',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="trophy" size={size} color={color} />
          ),
        }}
      />

      {/* Profile Tab with a Person Icon */}
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />

      {/* Messages Tab with a Chat Icon and Notification Badge */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <View>
              {/* Message Icon */}
              <MaterialIcons name="chat" size={size} color={color} />

              {/* Notification Badge */}
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  notificationBadge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
