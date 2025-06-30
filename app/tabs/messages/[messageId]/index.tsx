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
  Alert,
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
  arrayUnion,
  arrayRemove,
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
  const [isEitherUserBlocked, setIsEitherUserBlocked] = useState(false);
  const [isRecipientBlockedByCurrentUser, setIsRecipientBlockedByCurrentUser] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

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

  useEffect(() => {
    if (!messageId) return;

    const fetchConversationDetails = async () => {
      try {
        const conversationRef = doc(db, 'conversations', messageId);
        const conversationSnap = await getDoc(conversationRef);

        if (conversationSnap.exists()) {
          const conversationData = conversationSnap.data();
          const participants = conversationData.participants;
          const otherUserId = participants.find((id: string) => id !== auth.currentUser?.uid);
          setRecipientId(otherUserId);

          const recipientDoc = await getDoc(doc(db, 'users', otherUserId));
          const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));

          if (recipientDoc.exists()) {
            const data = recipientDoc.data();
            setRecipientUsername(data.username || 'Unknown');
            setRecipientProfilePicture(data.photoURL || null);
          }

          if (currentUserDoc.exists() && recipientDoc.exists()) {
            const currentData = currentUserDoc.data();
            const recipientData = recipientDoc.data();
            const currentBlocked = currentData.blockedUsers || [];
            const recipientBlocked = recipientData.blockedUsers || [];

            setIsRecipientBlockedByCurrentUser(currentBlocked.includes(otherUserId));
            setIsEitherUserBlocked(currentBlocked.includes(otherUserId) || recipientBlocked.includes(auth.currentUser.uid));
          }
        }
      } catch (error) {
        console.error('Error fetching conversation details:', error);
      }

      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', messageId),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const msgsData = snapshot.docs.map((doc) => doc.data() as Message);
        setMsgs(msgsData);
      });

      return () => unsubscribe();
    };

    fetchConversationDetails();
  }, [messageId]);

  useEffect(() => {
    if (!messageId || !auth.currentUser) return;
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', messageId),
      where('recipientId', '==', auth.currentUser.uid),
      where('isRead', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      (async () => {
        snapshot.forEach(async (messageDoc) => {
          await updateDoc(messageDoc.ref, { isRead: true });
        });
        if (!snapshot.empty) {
          const conversationRef = doc(db, 'conversations', messageId);
          await updateDoc(conversationRef, { 'lastMessage.isRead': true });
        }
      })();
    });
    return () => unsubscribe();
  }, [messageId]);

  const handleBlockUnblockUser = () => {
    if (isRecipientBlockedByCurrentUser) {
      Alert.alert(
        'Unblock User',
        'Do you want to unblock this user?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unblock',
            onPress: async () => {
              try {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                  blockedUsers: arrayRemove(recipientId),
                });
                setIsRecipientBlockedByCurrentUser(false);
                setIsEitherUserBlocked(false);
                Alert.alert('User unblocked');
              } catch (error) {
                console.error('Error unblocking user:', error);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Block User',
        'Are you sure you want to block this user? You will no longer receive messages from them.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              try {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                  blockedUsers: arrayUnion(recipientId),
                });
                setIsRecipientBlockedByCurrentUser(true);
                setIsEitherUserBlocked(true);
                Alert.alert('User blocked');
              } catch (error) {
                console.error('Error blocking user:', error);
              }
            },
          },
        ]
      );
    }
  };

  const handleSendMessage = async () => {
    if (!auth.currentUser || !newMessage.trim()) return;
    if (isEitherUserBlocked) {
      Alert.alert('Blocked', "You can't send messages to or receive from this user.");
      return;
    }

    try {
      const messageData: Message = {
        senderId: auth.currentUser.uid,
        message: newMessage,
        recipientId,
        timestamp: serverTimestamp(),
        isRead: false,
      };

      await addDoc(collection(db, 'messages'), {
        ...messageData,
        conversationId: messageId,
      });

      await updateDoc(doc(db, 'conversations', messageId), {
        lastMessage: {
          message: newMessage,
          senderId: auth.currentUser.uid,
          timestamp: serverTimestamp(),
          isRead: false,
        },
      });

      setNewMessage('');
      setIsUserScrolling(false);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Error sending message:', error);
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
    ) return 'Today';
    else if (
      msgDate.getDate() === yesterday.getDate() &&
      msgDate.getMonth() === yesterday.getMonth() &&
      msgDate.getFullYear() === yesterday.getFullYear()
    ) return 'Yesterday';
    else return msgDate.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        {recipientProfilePicture ? (
          <Image source={{ uri: recipientProfilePicture }} style={styles.profilePicture} />
        ) : (
          <View style={styles.profilePicturePlaceholder} />
        )}
        <Text style={styles.profileUsername}>{recipientUsername}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleBlockUnblockUser}>
          <Ionicons name="ellipsis-vertical" size={20} color="#333" style={{ marginRight: 5 }} />
        </TouchableOpacity>
      </View>

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
          <Text style={styles.noMessagesText}>No messages yet. Start the conversation!</Text>
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
              new Date(msgs[index - 1].timestamp.seconds * 1000).getHours() !== msgDate.getHours();

            return (
              <View key={index}>
                {shouldShowDate && (
                  <Text style={styles.dateIndicator}>
                    {formattedDate} - {formattedTime}
                  </Text>
                )}
                <View
                  style={[styles.messageBubble, msg.senderId === auth.currentUser?.uid ? styles.sentMessage : styles.receivedMessage]}
                >
                  <Text style={[styles.messageText, msg.senderId !== auth.currentUser?.uid && styles.receivedMessageText]}>
                    {msg.message}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

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
  messageContainer: { flex: 1, paddingHorizontal: 10 },
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
