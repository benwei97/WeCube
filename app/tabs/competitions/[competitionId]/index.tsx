import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image, 
  StyleSheet 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { AntDesign } from '@expo/vector-icons'; // Importing icon for FAB

// Define the Listing interface
interface Listing {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  puzzleType: string;
  usage: string;
  description: string;
  userId: string;
  createdAt: number;
}

const Listings = () => {
  const { competitionId, name } = useLocalSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const q = query(collection(db, 'listings'), where('competitionId', '==', competitionId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listingsData = snapshot.docs.map(doc => {
        const data = doc.data();

        return {
          id: doc.id,
          name: data.name || 'Unnamed',
          price: data.price || 0,
          imageUrl: data.imageUrl || '',
          puzzleType: data.puzzleType || 'Unknown',
          usage: data.usage || 'Unknown',
          description: data.description || '',
          userId: data.userId || 'Unknown',
          createdAt: data.createdAt || Date.now(),
        } as Listing; 
      });

      setListings(listingsData);
      setLoading(false);
    }, error => {
      console.error('Error fetching listings:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [competitionId]);

  useEffect(() => {
    if (name) {
      router.setParams({ name });
    }
  }, [name]);

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Loading listings...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      
      {listings.length === 0 ? (
        <View style={styles.centeredContainer}>
          <Text style={styles.placeholderText}>No listings yet!</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.cardContainer} 
              onPress={() => router.push(`/tabs/competitions/${competitionId}/${item.id}`)}
            >
              <View style={styles.card}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>No Image</Text>
                  </View>
                )}
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardPrice}>${item.price}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Floating Action Button for Creating a Listing */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push(`/tabs/competitions/${competitionId}/create-listing`)}
      >
        <AntDesign name="plus" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default Listings;

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f2f5',
  },
  placeholderText: {
    fontSize: 18,
    color: '#777',
    fontStyle: 'italic',
  },
  cardContainer: {
    marginBottom: 15,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  imagePlaceholderText: {
    color: '#555',
    fontSize: 14,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 6,
  },
  cardPrice: {
    fontSize: 14,
    color: '#666', // Green for emphasis
    fontWeight: '500',
    marginTop: 2,
  },

  // Floating Action Button (FAB)
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007BFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
});
