import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  collection,
  addDoc,
} from 'firebase/firestore';
import { db, auth } from '../../../../../firebase';
import { Ionicons } from '@expo/vector-icons';

const ListingDetails = () => {
  const { listingId } = useLocalSearchParams<{ listingId?: string | string[] }>();
  const parsedId = Array.isArray(listingId) ? listingId[0] : listingId;

  const [listing, setListing] = useState<any>(null);
  const [sellerUsername, setSellerUsername] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!parsedId) return;

    const fetchListing = async () => {
      try {
        const docRef = doc(db, 'listings', parsedId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setListing({ id: parsedId, ...data });

          const userSnap = await getDoc(doc(db, 'users', data.userId));
          setSellerUsername(userSnap.exists() ? userSnap.data().username : 'Unknown');

          setIsOwner(auth.currentUser?.uid === data.userId);
        }
      } catch (err) {
        console.error('Error:', err);
      }
    };
    fetchListing();
  }, [parsedId]);

  const handleDeleteListing = async () => {
    if (!parsedId || !isOwner) return;
    Alert.alert('Delete Listing', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'listings', parsedId));
            Alert.alert('Deleted');
            router.back();
          } catch (err) {
            Alert.alert('Error deleting');
          }
        },
      },
    ]);
  };

  const handleContactSeller = async () => {
    if (!auth.currentUser) {
      alert('Login to contact');
      router.push('/login');
      return;
    }
    const buyerId = auth.currentUser.uid;
    const sellerId = listing?.userId;
    if (!sellerId) return;

    const ids = [buyerId, sellerId].sort();
    const conversationId = `${ids[0]}_${ids[1]}`;
    const ref = doc(db, 'conversations', conversationId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        participants: ids,
        createdAt: serverTimestamp(),
        lastMessage: '',
        unreadBy: [sellerId],
      });
    }
    router.push('/tabs/messages');
    setTimeout(() => router.push(`/tabs/messages/${conversationId}`), 1);
  };

  const handleReportListing = () => {
    Alert.prompt('Report Listing', 'Reason?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async (reason) => {
          if (!auth.currentUser || !parsedId) return Alert.alert('Login to report');
          try {
            await addDoc(collection(db, 'reports'), {
              listingId: parsedId,
              reportedBy: auth.currentUser.uid,
              reason,
              createdAt: serverTimestamp(),
              type: 'listing',
            });
            Alert.alert('Report submitted');
          } catch (err) {
            Alert.alert('Failed');
          }
        },
      },
    ], 'plain-text');
  };

  if (!listing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading listing...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Image source={{ uri: listing.imageUrl }} style={styles.image} />

      <View style={styles.content}>
        <Text style={styles.title}>{listing.name}</Text>
        <Text style={styles.price}>${listing.price}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Type:</Text>
          <Text style={styles.metaValue}>{listing.puzzleType}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Usage:</Text>
          <Text style={styles.metaValue}>{listing.usage}</Text>
        </View>
        <Text style={styles.description}>{listing.description}</Text>

        <View style={styles.sellerRow}>
          <Ionicons name="person-circle-outline" size={28} color="#007BFF" />
          <Text style={styles.sellerText}>Sold by {sellerUsername}</Text>
        </View>

        {isOwner ? (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteListing}>
            <Text style={styles.deleteText}>Delete Listing</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.contactButton} onPress={handleContactSeller}>
              <Text style={styles.contactText}>Contact Seller</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reportButton} onPress={handleReportListing}>
              <Text style={styles.reportText}>🚩 Report</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default ListingDetails;

const styles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: '#f6f8fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#555',
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: '#e0e0e0',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 6,
    color: '#222',
  },
  price: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  metaLabel: {
    fontWeight: '500',
    color: '#555',
    marginRight: 4,
  },
  metaValue: {
    color: '#333',
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  sellerText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#007BFF',
    fontWeight: '500',
  },
  contactButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  contactText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  deleteText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  reportButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  reportText: {
    color: '#888',
    fontSize: 14,
  },
});
