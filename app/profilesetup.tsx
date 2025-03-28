import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db, storage } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, query, collection, where, getDocs, setDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AntDesign } from '@expo/vector-icons';

const DEFAULT_AVATAR = 'https://via.placeholder.com/120'; 

const ProfileSetup = () => {
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(DEFAULT_AVATAR);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const user = auth.currentUser;

  const isValidUsername = (username: string) => {
    const usernameRegex = /^(?![_])\w{3,20}(?<![_])$/;
    return usernameRegex.test(username);
  };

  const bannedUsernames = ['admin', 'support', 'moderator'];

  // ✅ Let users choose between taking a photo or picking from gallery
  const handleImageChange = async () => {
    Alert.alert(
      'Upload Picture',
      'Choose an option',
      [
        { text: 'Take a Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickImage },
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
      aspect: [1, 1],
      quality: 0.2,
    });

    if (!result.canceled) {
      setProfilePicture(result.assets[0].uri);
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
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.2,
    });

    if (!result.canceled) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const handleProfileSetup = async () => {
    if (!user) return;
    setIsSubmitting(true);

    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedUsername) {
      Alert.alert('Error', 'Username cannot be empty.');
      setIsSubmitting(false);
      return;
    }

    if (!isValidUsername(trimmedUsername)) {
      Alert.alert(
        'Error',
        'Username must be 3-20 characters and contain only letters, numbers, and underscores (no leading or trailing underscores).'
      );
      setIsSubmitting(false);
      return;
    }

    if (bannedUsernames.includes(trimmedUsername)) {
      Alert.alert('Error', 'This username is not allowed. Please choose another.');
      setIsSubmitting(false);
      return;
    }

    try {
      const usernameQuery = query(collection(db, 'users'), where('username', '==', trimmedUsername));
      const querySnapshot = await getDocs(usernameQuery);

      if (!querySnapshot.empty) {
        Alert.alert('Error', 'Username is already taken. Please choose another.');
        setIsSubmitting(false);
        return;
      }

      await updateProfile(user, { displayName: trimmedUsername });

      let photoURL = profilePicture;
      if (photoURL !== DEFAULT_AVATAR) {
        setUploading(true);
        const response = await fetch(photoURL);
        const blob = await response.blob();
        const storageRef = ref(storage, `profilePictures/${user.uid}-${Date.now()}`);
        await uploadBytes(storageRef, blob);
        photoURL = await getDownloadURL(storageRef);
        setUploading(false);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        username: trimmedUsername,
        photoURL: photoURL !== DEFAULT_AVATAR ? photoURL : null,
        hasCompletedProfileSetup: true,
      });

      router.replace('/tabs/competitions'); 

    } catch (error) {
      Alert.alert('Error', 'Failed to complete profile setup. Please try again.');
      console.error('Profile setup error:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Choose a username and (optional) profile picture</Text>

          <TouchableOpacity onPress={handleImageChange} style={styles.profilePictureTouchable}>
            <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
            <View style={styles.cameraIcon}>
              <AntDesign name="camera" size={20} color="white" />
            </View>
          </TouchableOpacity>

          <TextInput
            placeholder="Enter your username"
            placeholderTextColor="#777"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            autoCapitalize="none"
          />

          <Text style={styles.usernameRules}>
            Username must be 3-20 characters long and contain only letters, numbers, and underscores. No leading or trailing underscores.
          </Text>

          {isSubmitting || uploading ? (
            <ActivityIndicator size="large" color="#007BFF" />
          ) : (
            <TouchableOpacity onPress={handleProfileSetup} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Finish Setup</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  inner: {
    padding: 25,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  profilePictureTouchable: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 42,
    right: 42,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 5,
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  usernameRules: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProfileSetup;
