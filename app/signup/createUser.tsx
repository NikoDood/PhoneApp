import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth"; // Import signIn
import { doc, setDoc } from "firebase/firestore";
import { auth, firestoreDB } from "../../services/firebase"; // Adjust the import path
import { useNavigation } from "@react-navigation/native"; // Import useNavigation
import { useRouter } from "expo-router";

const SignupScreen: React.FC = () => {
  const navigation = useNavigation(); // Initialize navigation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Validation function
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

  // Handle signup
  const handleSignup = async () => {
    if (!validateInput()) return; // Validate input before proceeding

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Create a user document in Firestore
      await setDoc(doc(firestoreDB, "users", user.uid), {
        email: user.email,
        createdAt: new Date(),
        // Add any other initial user data here
      });

      Alert.alert("Success", "User created successfully");

      // Log in the user after signup
      await signInWithEmailAndPassword(auth, email, password);

      // Navigate to home page
      //navigation.navigate("Home"); // Adjust to your home screen name
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#333",
  },
  input: {
    width: "100%",
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  button: {
    width: "100%",
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#007bff",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default SignupScreen;
