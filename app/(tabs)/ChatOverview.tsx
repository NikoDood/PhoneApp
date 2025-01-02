import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  where,
  query,
  getDocs,
} from "firebase/firestore";
import { firestoreDB, auth } from "../../services/firebase";
import { useRouter } from "expo-router";
import { Notifications } from "react-native-notifications";

interface Chat {
  id: string;
  chatId: string;
  otherUser: string;
}

export default function ChatOverview(): JSX.Element {
  const [chats, setChats] = useState<Chat[]>([]);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!auth.currentUser
  );
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      if (!user) {
        setChats([]); // Clear chats if user logs out
      }
    });

    return () => unsubscribeAuth(); // Cleanup auth listener
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !auth.currentUser) return;

    const unsubscribe = onSnapshot(
      collection(firestoreDB, `users/${auth.currentUser.uid}/chats`),
      (snapshot) => {
        const chatData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Chat[];
        setChats(chatData);
      },
      (error) => {
        console.error("Error fetching chats:", error);
        // No alert needed on logout as it may trigger here
        if (isAuthenticated) {
          Alert.alert("Error", "Failed to load chats.");
        }
      }
    );

    return () => unsubscribe(); // Cleanup Firestore listener on unmount or logout
  }, [isAuthenticated]);

  const handleInvite = async () => {
    if (!inviteEmail) {
      Alert.alert("Error", "Please enter an email to invite.");
      return;
    }

    try {
      const invitedUserQuery = query(
        collection(firestoreDB, "users"),
        where("email", "==", inviteEmail)
      );
      const querySnapshot = await getDocs(invitedUserQuery);

      if (querySnapshot.empty) {
        Alert.alert("Error", "User with this email does not exist.");
        return;
      }

      const invitedUserId = querySnapshot.docs[0].id;
      const combinedId =
        auth.currentUser?.uid! < invitedUserId
          ? `${auth.currentUser?.uid}-${invitedUserId}`
          : `${invitedUserId}-${auth.currentUser?.uid}`;

      const chatRef = doc(firestoreDB, `chats`, combinedId);
      await setDoc(chatRef, {
        users: [auth.currentUser?.uid, invitedUserId],
        createdAt: new Date(),
        status: "pending",
      });

      await Promise.all(
        [auth.currentUser?.uid!, invitedUserId].map((userId) =>
          setDoc(doc(firestoreDB, `users/${userId}/chats`, combinedId), {
            chatId: combinedId,
            otherUser:
              userId === auth.currentUser?.uid
                ? invitedUserId
                : auth.currentUser?.uid,
          })
        )
      );

      const inviteRef = doc(firestoreDB, `invites`, combinedId);
      await setDoc(inviteRef, {
        from: auth.currentUser?.uid,
        to: invitedUserId,
        chatId: combinedId,
        status: "pending",
      });

      Alert.alert("Success", "Chat invitation sent successfully!");
    } catch (error) {
      console.error("Error inviting user:", error);
      Alert.alert("Error", "Failed to invite user.");
    }
  };

  const openChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chats</Text>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => openChat(item.chatId)}
          >
            <Text style={styles.chatText}>{item.otherUser}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.inviteContainer}>
        <TextInput
          style={styles.input}
          placeholder="Invite by email"
          value={inviteEmail}
          onChangeText={setInviteEmail}
        />
        <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
          <Text style={styles.buttonText}>Invite</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  chatItem: {
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  chatText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  inviteContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  input: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  inviteButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
