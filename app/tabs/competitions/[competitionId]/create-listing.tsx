import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { db, auth } from '../../../../firebase';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons'; // ✅ Import icons

const puzzleTypes = [
  "3x3", "2x2", "4x4", "5x5", "6x6", "7x7",
  "Megaminx", "Pyraminx", "Skewb", "Square-1",
  "Clock", "Non-WCA", "Miscellaneous"
];

const usageOptions = ["New", "Like New", "Used"];

const CreateListing = () => {
  const { competitionId } = useLocalSearchParams();
  const [name, setName] = useState<string>('');
  const [puzzleType, setPuzzleType] = useState<string>(puzzleTypes[0]);
  const [price, setPrice] = useState<string>('');
  const [usage, setUsage] = useState<string>(usageOptions[0]);
  const [description, setDescription] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ✅ Let users choose between taking a photo or picking from gallery
  const handleImageChange = async () => {
    Alert.alert(
      'Upload Picture',
      'Choose an option',
      [
        { text: 'Take a Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library ', onPress: handlePickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // 📷 Take a new photo using the camera
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission to access camera is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.2,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // 🖼️ Choose an image from the gallery
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission to access media library is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.2,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // ✅ NEW: Delete uploaded image feature
  const handleDeleteImage = () => {
    Alert.alert(
      "Delete Image",
      "Are you sure you want to remove this image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => setImage(null),
        },
      ]
    );
  };

  const handlePriceChange = (input: string) => {
    let sanitizedInput = input.replace(/[^0-9.]/g, '');
    const parts = sanitizedInput.split('.');
    if (parts.length > 2) {
      sanitizedInput = `${parts[0]}.${parts[1]}`;
    }
    if (parts.length === 2 && parts[1].length > 2) {
      sanitizedInput = `${parts[0]}.${parts[1].slice(0, 2)}`;
    }
    setPrice(sanitizedInput);
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) {
      Alert.alert("You must be logged in to create a listing.");
      return;
    }

    if (!name || !puzzleType || !price || !usage) {
      Alert.alert("Please fill out all required fields!");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = '';
      if (image) {
        const storage = getStorage();
        const storageRef = ref(storage, `images/${Date.now()}_listing.jpg`);
        const response = await fetch(image);
        const blob = await response.blob();
        const uploadTask = uploadBytesResumable(storageRef, blob);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            reject,
            async () => {
              imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      await addDoc(collection(db, 'listings'), {
        name,
        puzzleType,
        price,
        usage,
        description,
        imageUrl,
        competitionId,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });

      setLoading(false);
      Alert.alert("Listing created successfully!");
      router.back();
    } catch (error) {
      console.error("Error creating listing: ", error);
      Alert.alert("Error creating listing. Please try again.");
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAwareScrollView 
        contentContainerStyle={styles.container} 
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={Platform.OS === 'ios' ? 140 : 60}
      >
        <View style={styles.card}>
          <TextInput
            placeholder="Puzzle Name"
            placeholderTextColor="#777"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <Text style={styles.label}>Select Puzzle Type:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={puzzleType}
              onValueChange={(itemValue) => setPuzzleType(itemValue as string)}
            >
              {puzzleTypes.map((type, index) => (
                <Picker.Item key={index} label={type} value={type} />
              ))}
            </Picker>
          </View>

          <TextInput
            value={`$${price}`}
            onChangeText={handlePriceChange}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.label}>Select Usage:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={usage}
              onValueChange={(itemValue) => setUsage(itemValue as string)}
            >
              {usageOptions.map((option, index) => (
                <Picker.Item key={index} label={option} value={option} />
              ))}
            </Picker>
          </View>

          <TextInput
            placeholder="Description (Optional)"
            placeholderTextColor="#777"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity onPress={handleImageChange}>
          <Text style={styles.uploadText}>Upload Picture</Text>
        </TouchableOpacity>

        {image && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.imagePreview} />
            <TouchableOpacity onPress={handleDeleteImage} style={styles.deleteIcon}>
              <Ionicons name="trash-outline" size={24} color="red" />
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#007BFF" />
        ) : (
          <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Submit Listing</Text>
          </TouchableOpacity>
        )}
      </KeyboardAwareScrollView>
    </TouchableWithoutFeedback>
  );
};


const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    flexGrow: 1,
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginTop: 10,
  },
  deleteIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 5,
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
  },
  uploadText: {
    textAlign: 'center',
    fontSize: 17,
    color: '#007BFF',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  imagePreview: {
    height: 150,
    width: '100%',
    marginTop: 10,
    borderRadius: 10,
  },
  submitButton: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
  },
});

export default CreateListing;
