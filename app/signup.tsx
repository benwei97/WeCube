import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Platform,
  UIManager,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { registerForPushNotificationsAsync } from '../pushNotifications';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (resendCountdown > 0) {
      const interval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [resendCountdown]);

  const generateUsername = () => `user${Date.now()}`;

  const handleSignUp = async () => {
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!agreedToTerms) {
      setError('You must agree to the Terms and Conditions.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const username = generateUsername();

      await updateProfile(user, { displayName: username });

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        username: username,
        photoURL: null,
        hasCompletedProfileSetup: false,
        createdAt: serverTimestamp(),
      });

      await sendEmailVerification(user);

      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await updateDoc(doc(db, 'users', user.uid), { pushToken });
      }

      setMessage('📩 Verification email sent! Please check your inbox.');
    } catch (error) {
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Try logging in instead.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please use a stronger password.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Sign-ups are currently disabled. Please contact support.';
            break;
          default:
            console.log('Sign-up failed:', error.message);
        }
      }

      setError(errorMessage);
    }
  };

  const resendVerificationEmail = async () => {
    const user = auth.currentUser;

    if (!user) {
      setError('You must be logged in to verify your email.');
      return;
    }

    await user.reload();

    if (user.emailVerified) {
      setMessage('✅ Your email is already verified. You can log in now.');
      return;
    }

    if (resendCountdown > 0) {
      setError(`⏳ Please wait ${resendCountdown} seconds before trying again.`);
      return;
    }

    try {
      await sendEmailVerification(user);
      setMessage('📩 Verification email resent! Check your inbox.');
      setResendCountdown(30);
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      let errorMessage = '❌ Failed to resend verification email. Please try again later.';

      if (error.code === 'auth/too-many-requests') {
        errorMessage = '⚠ You’ve requested too many emails. Please wait before trying again.';
        setResendCountdown(60);
      }

      setError(errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.inner}>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Create an Account</Text>
              <Text style={styles.subtitle}>Sign up to get started</Text>
            </View>

            <TextInput
              placeholder="Email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}  
              autoComplete="off" 
              style={styles.input}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                style={styles.passwordInput}
              />
              <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeIcon}>
                <Ionicons name={passwordVisible ? "eye-off" : "eye"} size={24} color="#777" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <TouchableOpacity
                style={{ marginRight: 8 }}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
              >
                <Ionicons
                  name={agreedToTerms ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={agreedToTerms ? '#007BFF' : '#aaa'}
                />
              </TouchableOpacity>
              <Text style={{ fontSize: 14, color: '#555' }}>
                I agree to the{' '}
                <Text style={{ color: '#007BFF' }} onPress={() => router.push('https://benwei97.github.io/WeCube/terms.html')}>
                  Terms and Conditions
                </Text>
              </Text>
            </View>

            {message ? <Text style={styles.successText}>{message}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity onPress={handleSignUp} style={styles.signupButton}>
              <Text style={styles.signupButtonText}>Sign Up</Text>
            </TouchableOpacity>

            {message.includes('Verification email sent') && (
              resendCountdown > 0 ? (
                <Text style={styles.cooldownText}>
                  ⏳ Please wait {resendCountdown} seconds before resending.
                </Text>
              ) : (
                <TouchableOpacity onPress={resendVerificationEmail} style={styles.link}>
                  <Text style={styles.linkText}>
                    Didn't receive an email? <Text style={styles.signupText}>Resend Verification</Text>
                  </Text>
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity onPress={() => router.replace('/login')} style={styles.link}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.signupText}>Log In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
  },
  cooldownText: {
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  input: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    backgroundColor: '#fff',
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  successText: {
    color: 'green',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 15,
  },
  errorText: {
    color: 'red',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 15,
  },
  signupButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#555',
    fontSize: 16,
  },
  signupText: {
    color: '#007BFF',
    fontWeight: 'bold',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 10,
  },
});

export default SignUp;
