import React, { useState, useEffect } from 'react';
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
import { auth, db, storage } from '../../../firebase.js';
import { updateProfile, signOut } from 'firebase/auth';
import { query, collection, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const ProfileScreen = () => {
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(userData.username || '');
            setProfilePicture(userData.photoURL || null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    };
    fetchUserProfile();
  }, []);

  const isValidUsername = (username) => {
    const usernameRegex = /^(?![_])\w{3,20}(?<![_])$/; 
    return usernameRegex.test(username);
  };
  
  const bannedUsernames = ["admin", "support", "moderator"]; 

  const pickImage = async () => {
    if (!isEditing) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.2,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const handleProfilePictureChange = async () => {
    if (!user || !profilePicture) return;
  
    try {
      console.log("🚀 Starting profile picture update...");
      console.log("📂 Current image URI:", profilePicture);
  
      setUploading(true);
  
      // Prevent fetching a Firebase Storage URL
      if (profilePicture.startsWith("https://")) {
        console.warn("⚠️ Skipping upload - Profile picture is already uploaded:", profilePicture);
        setUploading(false);
        return;
      }
  
      // Fetch image and convert to Blob
      const response = await fetch(profilePicture);
      const blob = await response.blob();
      console.log("✅ Blob created successfully");
  
      // Upload image to Firebase Storage
      const storageRef = ref(storage, `profilePictures/${user.uid}-${Date.now()}`);
      await uploadBytes(storageRef, blob);
      console.log("✅ Upload successful");
  
      // Get the download URL
      const photoURL = await getDownloadURL(storageRef);
      console.log("🌐 Download URL obtained:", photoURL);
  
      // Update Firebase Auth profile
      await updateProfile(user, { photoURL });
      console.log("✅ Firebase Auth profile updated");
  
      // Update Firestore user document
      await updateDoc(doc(db, "users", user.uid), { photoURL });
      console.log("✅ Firestore user document updated");
  
      // **Update state only with a valid uploaded URL**
      setProfilePicture(photoURL);
      console.log("🎉 Profile picture state updated");
  
      setUploading(false);
      console.log("🏁 Finished profile picture update");
    } catch (error) {
      console.error("❌ Error updating profile picture:", error);
      Alert.alert("Error", "Failed to update profile picture. Please try again.");
      setUploading(false);
    }
  };
  
  
  const handleSave = async () => {
    if (!user) return;
    
    // **Step 1: Validate Username First**
    const trimmedUsername = username.trim().toLowerCase();
  
    if (!trimmedUsername) {
      Alert.alert("Error", "Username cannot be empty.");
      return;
    }
  
    if (!isValidUsername(trimmedUsername)) {
      Alert.alert("Error", "Username must be 3-20 characters and contain only letters, numbers, and underscores.");
      return;
    }
  
    if (bannedUsernames.includes(trimmedUsername)) {
      Alert.alert("Error", "This username is not allowed. Please choose another.");
      return;
    }
  
    try {
      const usernameQuery = query(collection(db, "users"), where("username", "==", trimmedUsername));
      const querySnapshot = await getDocs(usernameQuery);
  
      const isTaken = querySnapshot.docs.some(doc => doc.id !== user.uid);
      if (isTaken) {
        Alert.alert("Error", "Username is already taken. Please choose another.");
        return;
      }
  
      // ✅ **Step 2: Update Username** (if no validation errors)
      await updateProfile(user, { displayName: trimmedUsername });
      await updateDoc(doc(db, "users", user.uid), { username: trimmedUsername });
  
      Alert.alert("Success", "Username updated successfully!");
  
    } catch (error) {
      Alert.alert("Error", "Failed to update username. Please try again.");
      return;
    }
  
    // ✅ **Step 3: Only Proceed with Profile Picture Update if Username was Successful**
    if (profilePicture) {
      await handleProfilePictureChange();
    }
  
    setIsEditing(false);
  };
  
  const confirmLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          onPress: handleLogout,
          style: "destructive",
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      Alert.alert('Error', 'There was an error logging out. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 55 : 50}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* Header with Edit, Save, and Cancel */}
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <View style={styles.actions}>
              {isEditing ? (
                <>
                  <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                    {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelButton}>
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={() => setIsEditing(true)}>
                  <MaterialIcons name="edit" size={24} color="#007BFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Profile Card */}
          <View style={styles.card}>
            <TouchableOpacity onPress={pickImage} style={styles.profilePictureTouchable} disabled={!isEditing}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <Text style={styles.imagePickerText}>+</Text>
                </View>
              )}
            </TouchableOpacity>

            {isEditing ? (
              <TextInput
                placeholder="Username"
                placeholderTextColor="#777"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.usernameText}>{username}</Text>
            )}
          </View>

          {/* Centered Logout Button (Hidden when Editing) */}
          {!isEditing && (
            <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
              <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
              <Text style={styles.logoutButtonText}>Logout</Text>
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
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 5,
  },
  profilePictureTouchable: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 15,
  },
  profilePicture: {
    width: '100%',
    height: '100%',
  },
  profilePicturePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    fontSize: 24,
    color: '#007BFF',
  },
  input: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: '#ccc',
    width: '100%',
    textAlign: 'center',
  },
  usernameText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  logoutButtonText: {
    marginLeft: 8,
    color: '#FF3B30',
    fontSize: 16,
  },
  cancelButton: {
    paddingHorizontal: 10,
  },
});

export default ProfileScreen;
