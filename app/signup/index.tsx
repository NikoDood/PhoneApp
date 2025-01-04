import React, { useState } from "react";
import {
  View,
  TextInput,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, firestoreDB } from "../../services/firebase";
import { useRouter } from "expo-router";

const SignupScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Some aalidation on user input :)
  const validateInput = () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password should be at least 6 characters long.");
      return false;
    }

    return true;
  };

  // Handle signup part
  const handleSignup = async () => {
    // Some simple validate input before moving on :)
    if (!validateInput()) return;

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Create a user in Firestore here
      await setDoc(doc(firestoreDB, "users", user.uid), {
        email: user.email,
        createdAt: new Date(),
      });

      Alert.alert("Success", "User created successfully");

      // Log in the user after signup
      await signInWithEmailAndPassword(auth, email, password);

      // Then navigate back to home page
      router.push("/");
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Error", "This email is already in use.");
      } else {
        Alert.alert("Signup error", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default SignupScreen;
