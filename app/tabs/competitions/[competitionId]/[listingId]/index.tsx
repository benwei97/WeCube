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
import { doc, getDoc, setDoc, serverTimestamp, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../../../../../firebase';
import { Ionicons } from '@expo/vector-icons';

interface Listing {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  puzzleType: string;
  usage: string;
  description: string;
  userId: string;
}

const ListingDetails = () => {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [sellerUsername, setSellerUsername] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const docRef = doc(db, 'listings', listingId as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const listingData = docSnap.data() as Listing;
          setListing({
            id: listingId as string,
            name: listingData.name || 'Unnamed Listing',
            price: listingData.price || 0,
            imageUrl: listingData.imageUrl || '',
            puzzleType: listingData.puzzleType || 'Unknown',
            usage: listingData.usage || 'Unknown',
            description: listingData.description || '',
            userId: listingData.userId || 'Unknown',
          });

          const userDocRef = doc(db, 'users', listingData.userId);
          const userDocSnap = await getDoc(userDocRef);
          setSellerUsername(userDocSnap.exists() ? userDocSnap.data().username : 'Unknown');

          setIsOwner(auth.currentUser?.uid === listingData.userId);
        }
      } catch (error) {
        console.error('Error fetching listing:', error);
      }
    };

    fetchListing();
  }, [listingId]);

  const handleDeleteListing = async () => {
    if (!isOwner) return;

    Alert.alert('Delete Listing', 'Are you sure you want to delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'listings', listingId as string));
            Alert.alert('Listing deleted successfully!');
            router.back();
          } catch (error) {
            console.error('Error deleting listing:', error);
            Alert.alert('Failed to delete listing. Please try again.');
          }
        },
      },
    ]);
  };

  const handleContactSeller = async () => {
    if (!auth.currentUser) {
      alert('You must be logged in to contact the seller.');
      router.push('/login');
      return;
    }

    const buyerId = auth.currentUser.uid;
    const sellerId = listing?.userId;
    if (!sellerId) return;

    const sortedIds = [buyerId, sellerId].sort();
    const conversationId = `${sortedIds[0]}_${sortedIds[1]}`;

    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      await setDoc(conversationRef, {
        participants: sortedIds,
        createdAt: serverTimestamp(),
        lastMessage: '',
        unreadBy: [sellerId],
      });
    }

    router.push('/tabs/messages');
    setTimeout(() => router.push(`/tabs/messages/${conversationId}`), 1);
  };

  const handleReportListing = () => {
    Alert.prompt(
      '🚩 Report Listing',
      'Why are you reporting this listing? (e.g., spam, scam, offensive)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (reason) => {
            try {
              const user = auth.currentUser;
              if (!user) {
                Alert.alert('You must be logged in to report a listing.');
                return;
              }
              await addDoc(collection(db, 'reports'), {
                listingId,
                reportedBy: user.uid,
                reason,
                createdAt: serverTimestamp(),
                type: 'listing',
              });
              Alert.alert('✅ Report submitted', 'Thanks for helping us keep the app safe.');
            } catch (err) {
              console.error('Error submitting report:', err);
              Alert.alert('❌ Error', 'Could not submit report. Try again later.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  if (!listing) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Loading listing details...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: listing.imageUrl }} style={styles.listingImage} />

      <View style={styles.card}>
        <Text style={styles.listingName}>{listing.name}</Text>
        <Text style={styles.listingDetail}>Price: <Text style={styles.detailValue}>${listing.price}</Text></Text>
        <Text style={styles.listingDetail}>Puzzle Type: <Text style={styles.detailValue}>{listing.puzzleType}</Text></Text>
        <Text style={styles.listingDetail}>Usage: <Text style={styles.detailValue}>{listing.usage}</Text></Text>
        <Text style={styles.listingDetail}>Description:</Text>
        <Text style={styles.listingDescription}>{listing.description}</Text>
      </View>

      <View style={styles.sellerInfo}>
        <Ionicons name="person-circle" size={50} color="#007BFF" />
        <Text style={styles.sellerName}>Sold by: {sellerUsername}</Text>
      </View>

      <View style={styles.buttonContainer}>
        {isOwner ? (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteListing}>
            <Text style={styles.deleteButtonText}>Delete Listing</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.contactButton} onPress={handleContactSeller}>
              <Text style={styles.contactButtonText}>Contact Seller</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reportButton} onPress={handleReportListing}>
              <Text style={styles.reportButtonText}>🚩 Report</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5' },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5, elevation: 3,
  },
  listingImage: { width: '100%', height: 250, borderRadius: 12, marginBottom: 20, resizeMode: 'cover' },
  listingName: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  listingDetail: { fontSize: 16, marginBottom: 5, color: '#555' },
  detailValue: { fontWeight: 'bold', color: '#333' },
  listingDescription: { fontSize: 14, marginTop: 5, color: '#666', lineHeight: 20 },
  sellerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  sellerName: { fontSize: 16, marginLeft: 10, color: '#007BFF', fontWeight: 'bold' },
  buttonContainer: { alignItems: 'center' },
  deleteButton: {
    backgroundColor: '#FF3B30', padding: 12, borderRadius: 25,
    width: '80%', alignItems: 'center', marginTop: 10,
  },
  deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  contactButton: {
    backgroundColor: '#007BFF', padding: 12, borderRadius: 25,
    width: '80%', alignItems: 'center',
  },
  contactButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  reportButton: {
    borderColor: '#aaa', borderWidth: 1, paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 18, marginTop: 10, alignItems: 'center',
  },
  reportButtonText: { color: '#666', fontSize: 14, fontWeight: '500' },
});

export default ListingDetails;
