import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Keyboard,
  LayoutAnimation,
  Platform,
  EmitterSubscription,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDoc,
  updateDoc,
  orderBy,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../../../../firebase';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  senderId: string;
  message: string;
  recipientId: string;
  timestamp: any;
  isRead: boolean;
}

const MessageScreen = () => {
  const { messageId } = useLocalSearchParams<{ messageId: string }>();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [recipientProfilePicture, setRecipientProfilePicture] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  // Keyboard listeners (unchanged)
  useEffect(() => {
    let showListener: EmitterSubscription;
    let hideListener: EmitterSubscription;

    if (Platform.OS === 'ios') {
      showListener = Keyboard.addListener('keyboardWillShow', (event) => {
        setKeyboardHeight(event.endCoordinates.height - 114);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      });

      hideListener = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardHeight(0);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      });
    } else {
      showListener = Keyboard.addListener('keyboardDidShow', (event) => {
        setKeyboardHeight(event.endCoordinates.height - 114);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      });

      hideListener = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      });
    }

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Fetch conversation and recipient details
  useEffect(() => {
    if (!messageId) {
      console.error('Message ID not provided!');
      return;
    }

    const fetchConversationDetails = async () => {
      try {
        const conversationRef = doc(db, 'conversations', messageId as string);
        const conversationSnap = await getDoc(conversationRef);

        if (conversationSnap.exists()) {
          const conversationData = conversationSnap.data();
          const participants = conversationData.participants;

          const otherUserId = participants.find(
            (id: string) => id !== auth.currentUser?.uid
          );
          setRecipientId(otherUserId);

          const recipientDocRef = doc(db, 'users', otherUserId);
          const recipientDocSnap = await getDoc(recipientDocRef);

          if (recipientDocSnap.exists()) {
            setRecipientUsername(recipientDocSnap.data().username || 'Unknown');
            setRecipientProfilePicture(recipientDocSnap.data().photoURL || null);
          }
        }
      } catch (error) {
        console.error('Error fetching recipient details:', error);
      }

      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', messageId),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const msgsData = snapshot.docs.map((doc) => ({
          senderId: doc.data().senderId,
          message: doc.data().message,
          recipientId: doc.data().recipientId,
          timestamp: doc.data().timestamp,
          isRead: doc.data().isRead,
        }));

        setMsgs(msgsData);
      });

      return () => unsubscribe();
    };

    fetchConversationDetails();
  }, [messageId]);

  // Mark messages as read when the conversation screen mounts
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!messageId || !auth.currentUser) return;
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', messageId),
        where('recipientId', '==', auth.currentUser.uid),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (messageDoc) => {
        await updateDoc(messageDoc.ref, { isRead: true });
      });
      const conversationRef = doc(db, 'conversations', messageId);
      await updateDoc(conversationRef, {
        'lastMessage.isRead': true,
      });
    };

    markMessagesAsRead();
  }, [messageId]);

  const handleSendMessage = async () => {
    if (!auth.currentUser || !newMessage.trim()) return;

    try {
      const messageData: Message = {
        senderId: auth.currentUser.uid,
        message: newMessage,
        recipientId: recipientId,
        timestamp: serverTimestamp() as any,
        isRead: false,
      };

      // Add the message to the 'messages' collection
      await addDoc(collection(db, 'messages'), {
        ...messageData,
        conversationId: messageId,
      });

      // Update lastMessage in the conversations collection
      await updateDoc(doc(db, 'conversations', messageId), {
        lastMessage: {
          message: newMessage,
          senderId: auth.currentUser.uid,
          timestamp: serverTimestamp(),
          isRead: false,
        },
      });

      // Clear input and auto-scroll
      setNewMessage('');
      setIsUserScrolling(false);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  };

  const formatDate = (msgDate: Date): string => {
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    if (
      msgDate.getDate() === now.getDate() &&
      msgDate.getMonth() === now.getMonth() &&
      msgDate.getFullYear() === now.getFullYear()
    ) {
      return 'Today';
    } else if (
      msgDate.getDate() === yesterday.getDate() &&
      msgDate.getMonth() === yesterday.getMonth() &&
      msgDate.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Yesterday';
    } else {
      return msgDate.toLocaleDateString();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.profileHeader}>
        {recipientProfilePicture ? (
          <Image
            source={{ uri: recipientProfilePicture }}
            style={styles.profilePicture}
          />
        ) : (
          <View style={styles.profilePicturePlaceholder} />
        )}
        <Text style={styles.profileUsername}>{recipientUsername}</Text>
      </View>

      {/* Messages List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messageContainer}
        contentContainerStyle={{ paddingBottom: keyboardHeight + 60, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (!isUserScrolling) {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }
        }}
        onScrollBeginDrag={() => setIsUserScrolling(true)}
        onScrollEndDrag={() => setIsUserScrolling(false)}
      >
        {msgs.length === 0 ? (
          <Text style={styles.noMessagesText}>
            No messages yet. Start the conversation!
          </Text>
        ) : (
          msgs.map((msg, index) => {
            const msgDate = msg.timestamp?.seconds
              ? new Date(msg.timestamp.seconds * 1000)
              : new Date();
            const formattedTime = msgDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const formattedDate = formatDate(msgDate);

            const shouldShowDate =
              index === 0 ||
              new Date(msgs[index - 1].timestamp.seconds * 1000).getHours() !==
                msgDate.getHours();

            return (
              <View key={index}>
                {shouldShowDate && (
                  <Text style={styles.dateIndicator}>
                    {formattedDate} - {formattedTime}
                  </Text>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    msg.senderId === auth.currentUser?.uid
                      ? styles.sentMessage
                      : styles.receivedMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.senderId !== auth.currentUser?.uid &&
                        styles.receivedMessageText,
                    ]}
                  >
                    {msg.message}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Input Field */}
      <View style={[styles.inputContainer, { bottom: keyboardHeight }]}>
        <TextInput
          placeholder="Type a message..."
          placeholderTextColor="#777"
          value={newMessage}
          onChangeText={setNewMessage}
          style={styles.textInput}
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          disabled={!newMessage.trim()}
          style={styles.sendButton}
        >
          <Ionicons name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MessageScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  profilePicture: { width: 40, height: 40, borderRadius: 20, marginHorizontal: 10 },
  profileUsername: { fontSize: 18, fontWeight: 'bold' },
  dateIndicator: { textAlign: 'center', color: '#777', marginVertical: 10 },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '75%',
    marginVertical: 5,
  },
  sentMessage: { alignSelf: 'flex-end', backgroundColor: '#007BFF' },
  receivedMessage: { alignSelf: 'flex-start', backgroundColor: '#E0E0E0' },
  receivedMessageText: { color: '#000' },
  messageText: { fontSize: 16, color: '#fff' },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#f5f5f5',
    height: 40,
  },
  sendButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#007BFF',
    marginLeft: 10,
  },
  profilePicturePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  messageContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  noMessagesText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
});
