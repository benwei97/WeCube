import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  updateDoc,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../../../firebase'; 
import { useRouter } from 'expo-router';

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    message: string;
    senderId: string;
    timestamp: any;
    isRead?: boolean;
  };
}

interface User {
  username: string;
  photoURL: string;
}

const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [usernames, setUsernames] = useState<{ [key: string]: User }>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth.currentUser) return;
  
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', auth.currentUser.uid)
    );
  
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convos: Conversation[] = [];
      const usernamesMap: { [key: string]: User } = {};
  
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data() as Conversation;
        const conversationData = { ...data, id: docSnapshot.id };
  
        // **Fetch Last Message**
        const messagesQuery = query(
          collection(db, "messages"),
          where("conversationId", "==", docSnapshot.id),
          orderBy("timestamp", "desc"),
          limit(1)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        
        if (!messagesSnapshot.empty) {
          const lastMessageData = messagesSnapshot.docs[0].data();
          conversationData.lastMessage = lastMessageData as {
            message: string;
            senderId: string;
            timestamp: any;
            isRead?: boolean;
          };
  
          convos.push(conversationData); // ✅ Add conversation only if a message exists
        }
  
        const otherParticipantId = data.participants.find(
          (id) => id !== auth.currentUser?.uid
        );
        if (otherParticipantId && !usernamesMap[otherParticipantId]) {
          const userDocRef = doc(db, 'users', otherParticipantId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as User;
            usernamesMap[otherParticipantId] = {
              username: userData.username || 'Unknown',
              photoURL: userData.photoURL || 'https://via.placeholder.com/40',
            };
          }
        }
      }
  
      // **Sort Conversations by Most Recent Message**
      convos.sort((a, b) => {
        if (a.lastMessage?.timestamp && b.lastMessage?.timestamp) {
          return b.lastMessage.timestamp.toMillis() - a.lastMessage.timestamp.toMillis();
        }
        return 0;
      });
  
      setConversations(convos);
      setUsernames(prevState => ({ ...prevState, ...usernamesMap }));
      setLoading(false);
    });
  
    return () => unsubscribe();
  }, []);
  

  const handleConversationClick = async (conversation: Conversation) => {
    // Navigate to the conversation screen
    router.push(`/tabs/messages/${conversation.id}`);

    // The following logic is commented out so that the unread messages
    // are NOT marked as read until the user actually views the conversation.
    /*
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversation.id),
      where('recipientId', '==', auth.currentUser?.uid),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.forEach(async (messageDoc) => {
        await updateDoc(messageDoc.ref, { isRead: true });
      });
    });

    if (
      conversation.lastMessage?.isRead === false &&
      conversation.lastMessage?.senderId !== auth.currentUser?.uid
    ) {
      const conversationRef = doc(db, 'conversations', conversation.id);
      await updateDoc(conversationRef, {
        'lastMessage.isRead': true,
      });
    }

    return () => unsubscribe();
    */
  };

  const hasUnreadMessages = (conversation: Conversation): boolean => {
    return (
      conversation.lastMessage?.isRead === false &&
      conversation.lastMessage?.senderId !== auth.currentUser?.uid
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No conversations yet.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const otherParticipantId = item.participants.find(
          (id) => id !== auth.currentUser?.uid
        );
        const otherParticipant =
          usernames[otherParticipantId || ''] || {
            username: 'Unknown',
            photoURL: 'https://via.placeholder.com/40',
          };

        return (
          <TouchableOpacity
            onPress={() => handleConversationClick(item)}
            style={styles.conversationItem}
          >
            <Image
              source={{ uri: otherParticipant.photoURL }}
              style={styles.profilePicture}
            />
            <View style={styles.conversationDetails}>
              <Text style={styles.username}>
                {otherParticipant.username}
              </Text>
              <View style={styles.lastMessageContainer}>
                <Text
                  style={[
                    styles.lastMessage,
                    hasUnreadMessages(item) ? styles.unreadMessage : {},
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage?.message || 'No messages yet'}
                </Text>
                <Text style={styles.timeIndicator}>
                  {item.lastMessage?.timestamp
                    ? formatTimestamp(item.lastMessage.timestamp)
                    : ''}
                </Text>
              </View>
            </View>
            {hasUnreadMessages(item) && (
              <View style={styles.unreadIndicator} />
            )}
          </TouchableOpacity>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

// Format timestamps for last message
const formatTimestamp = (timestamp: any) => {
  const date = timestamp.toDate();
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    fontStyle: 'italic',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 5,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profilePicture: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 15,
    backgroundColor: '#ddd',
  },
  conversationDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#777',
    flexShrink: 1,
  },
  unreadMessage: { 
    fontWeight: 'bold',
    color: '#000',
  },
  timeIndicator: {
    fontSize: 12,
    color: '#aaa',
    marginLeft: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 15,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -5 }],
  },
});

export default Messages;
