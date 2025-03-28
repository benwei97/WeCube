import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to WeCube</Text>
      <Text style={styles.subtitle}>Your all-in-one marketplace for WCA competitions.</Text>

      {/* Buttons */}
      <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.signupButton]} onPress={() => router.push('/signup')}>
        <Text style={[styles.buttonText, styles.signupButtonText]}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    width: '80%',
    paddingVertical: 15,
    borderRadius: 25,
    backgroundColor: '#007BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007BFF',
  },
  signupButtonText: {
    color: '#007BFF',
  },
});

