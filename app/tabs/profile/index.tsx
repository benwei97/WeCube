import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { updateProfile, signOut, deleteUser } from 'firebase/auth';
import { doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const ProfileScreen = () => {
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
            setProfilePicture(userData.photoURL || null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    };
    fetchUserProfile();
  }, []);

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
      setUploading(true);

      let finalURL = profilePicture;
      if (!profilePicture.startsWith('https://')) {
        const response = await fetch(profilePicture);
        const blob = await response.blob();
        const storageRef = ref(storage, `profilePictures/${user.uid}-${Date.now()}`);
        await uploadBytes(storageRef, blob);
        finalURL = await getDownloadURL(storageRef);
        setProfilePicture(finalURL);
      }

      await updateProfile(user, { photoURL: finalURL });
      await updateDoc(doc(db, 'users', user.uid), { photoURL: finalURL });

      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.error('Error updating profile picture:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (profilePicture) {
      await handleProfilePictureChange();
    }
    setIsEditing(false);
  };

  const confirmLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: handleLogout, style: 'destructive' },
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

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: handleDeleteAccount, style: 'destructive' },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    try {
      if (!user) return;
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
      router.replace('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete account. Please re-authenticate and try again.');
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
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <View style={styles.actions}>
              {isEditing ? (
                <>
                  <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                    {uploading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
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
            <Text style={styles.usernameText}>{user?.displayName || ''}</Text>
          </View>

          {!isEditing && (
            <View style={styles.accountActions}>
              <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
                <Ionicons name="log-out-outline" size={20} color="#555" />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={confirmDeleteAccount}>
                <Text style={styles.deleteButtonText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  saveButton: { backgroundColor: '#007BFF', padding: 10, borderRadius: 8 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { paddingHorizontal: 10 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center', elevation: 5 },
  profilePictureTouchable: { width: 120, height: 120, borderRadius: 60, overflow: 'hidden', marginBottom: 15 },
  profilePicture: { width: '100%', height: '100%' },
  profilePicturePlaceholder: { width: '100%', height: '100%', backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  imagePickerText: { fontSize: 24, color: '#007BFF' },
  usernameText: { fontSize: 18, fontWeight: 'bold' },
  accountActions: { marginTop: 30, alignItems: 'center' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#eee', borderRadius: 8 },
  logoutButtonText: { marginLeft: 8, color: '#555', fontSize: 15 },
  deleteButton: { marginTop: 10, padding: 6, borderRadius: 6 },
  deleteButtonText: { color: '#999', fontSize: 13, textDecorationLine: 'underline' },
});

export default ProfileScreen;
