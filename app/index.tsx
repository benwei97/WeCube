import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { registerForPushNotificationsAsync } from '../pushNotifications';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Persistent login check
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/tabs/competitions'); // Already logged in
      } else {
        setCheckingAuth(false); // Show landing screen
      }
    });

    registerForPushNotificationsAsync();

    return unsubscribe;
  }, []);

  if (checkingAuth) {
    // While checking, show spinner
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require('../assets/wecube-logo.png')} // update path as needed
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Welcome Text */}
      <Text style={styles.title}>Welcome to <Text style={styles.brand}>WeCube</Text></Text>
      <Text style={styles.subtitle}>Buy, sell, and trade Rubik’s cubes with trusted cubers around the world.</Text>

      {/* Buttons */}
      <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.signupButton]} onPress={() => router.push('/signup')}>
        <Text style={[styles.buttonText, styles.signupButtonText]}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  brand: {
    color: '#007BFF',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 36,
    paddingHorizontal: 12,
  },
  button: {
    width: '85%',
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#007BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#007BFF',
  },
  signupButtonText: {
    color: '#007BFF',
  },
});
