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
  LayoutAnimation,
  UIManager,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resendCooldown, setResendCountdown] = useState(0);
  const [userForResend, setUserForResend] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (resendCooldown > 0) {
      const interval = setInterval(() => {
        setResendCountdown((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [resendCooldown]);

  const handleLogin = async () => {
    setError('');
    setMessage('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setError('⚠ Your email is not verified. Please check your inbox.');
        setUserForResend(user); // Save user for resend option
        return;
      }

      // ✅ Check if user has completed profile setup in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (userData && !userData.hasCompletedProfileSetup) {
        console.log('Redirecting to profile setup...');
        router.replace('/profilesetup');
      } else {
        console.log('Login successful, navigating to home page...');
        router.replace('/tabs/competitions');
      }
    } catch (error) {
      let errorMessage = 'An unexpected error occurred. Please try again.';

      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/missing-password':
          errorMessage = 'Please enter your password.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled. Contact support for help.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Incorrect email or password. Please try again.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many login attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        default:
          console.log('Login failed:', error.message);
      }

      setError(errorMessage);
    }
  };

  // ✅ Resend Verification Email when Login Fails Due to Unverified Email
  const resendVerificationEmail = async () => {
    if (!userForResend) return;

    await userForResend.reload();

    if (userForResend.emailVerified) {
      setMessage('✅ Your email is already verified. You can log in now.');
      return;
    }

    if (resendCooldown > 0) {
      setError(`⏳ Please wait ${resendCooldown} seconds before trying again.`);
      return;
    }

    try {
      await sendEmailVerification(userForResend);
      setMessage('📩 Verification email resent! Check your inbox.');
      setResendCountdown(30);
    } catch (error) {
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
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Log in to continue</Text>
            </View>

            <TextInput
              placeholder="Email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />

            {message ? <Text style={styles.successText}>{message}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity onPress={handleLogin} style={styles.loginButton}>
              <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>

            {userForResend && !userForResend.emailVerified && (
              resendCooldown > 0 ? (
                <Text style={styles.cooldownText}>
                  ⏳ Please wait {resendCooldown} seconds before resending.
                </Text>
              ) : (
                <TouchableOpacity onPress={resendVerificationEmail} style={styles.link}>
                  <Text style={styles.linkText}>
                    Didn't receive an email? <Text style={styles.signupText}>Resend Verification</Text>
                  </Text>
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity onPress={() => router.replace('/password-recovery')} style={styles.link}>
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace('/signup')} style={styles.link}>
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.signupText}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

/* 💡 Updated Styles with Grouped Header */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
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
    alignItems: 'center', // Keeps title & subtitle centered
    marginBottom: 30, // Provides space before inputs
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
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 14,
  },
  loginButton: {
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
  loginButtonText: {
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
});

export default Login;