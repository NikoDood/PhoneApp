import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { firestoreDB, auth } from "../../services/firebase";
import {
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  collection,
  query,
  orderBy,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { Notifications } from "react-native-notifications";
import Icon from "react-native-vector-icons/FontAwesome";

interface Message {
  id: string;
  text: string;
  sender: string;
  createdAt: Date;
}

export default function ChatRoom(): JSX.Element {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");

  const [inviteStatus, setInviteStatus] = useState<string>("");
  const [sender, setSender] = useState<string | null>(null);
  const [receiver, setReceiver] = useState<string | null>(null);
  const [isSender, setIsSender] = useState<boolean>(false);
  const [hasLeft, setHasLeft] = useState<boolean>(false); // Track if the user has left the chat
  const [chatData, setChatData] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    const inviteRef = doc(firestoreDB, `invites/${chatId}`);
    const unsubscribe = onSnapshot(
      inviteRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const inviteData = snapshot.data();
          setInviteStatus(inviteData?.status);
          setSender(inviteData?.fromEmail);
          setReceiver(inviteData?.toEmail);

          setIsSender(inviteData?.from === auth.currentUser?.uid);

          console.log(isSender);
        } else {
          console.error("Invite document does not exist.");
        }
      },
      (error) => {
        console.error("Error fetching invite data:", error);
      }
    );

    return unsubscribe;
  }, [chatId]);

  useEffect(() => {
    const messagesRef = collection(firestoreDB, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messageData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        setMessages(messageData);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        Alert.alert("Error", "Failed to load messages.");
      }
    );

    return unsubscribe;
  }, [chatId]);

  useEffect(() => {
    // Fetch chat data to display and confirm the user is part of the chat
    const chatRef = doc(firestoreDB, `chats/${chatId}`);
    const fetchChatData = async () => {
      try {
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
          setChatData(chatDoc.data());
        }
      } catch (error) {
        console.error("Error fetching chat data:", error);
      }
    };
    fetchChatData();
  }, [chatId]);

  useLayoutEffect(() => {
    const currentUser = auth.currentUser?.uid;
    setUserId(currentUser);
    const oppositeUser = currentUser === sender ? receiver : sender;

    if (oppositeUser) {
      navigation.setOptions({
        headerTitle: oppositeUser,
      });
    }
  }, [receiver, navigation, router]);

  // Handle Accept Invitation
  const handleAccept = async () => {
    if (isSender) {
      Alert.alert("Error", "You cannot accept your own invitation.");
      return;
    }

    try {
      const chatRef = doc(firestoreDB, `chats/${chatId}`);
      const invitesRef = doc(firestoreDB, `invites/${chatId}`);
      await updateDoc(chatRef, { status: "active" });
      await updateDoc(invitesRef, { status: "active" });

      Alert.alert("Success", "You have accepted the invitation!");
    } catch (error) {
      console.error("Error accepting invitation:", error);
      Alert.alert("Error", "Failed to accept the invitation.");
    }
  };

  // Send Message Functionality
  const sendMessage = async () => {
    if (newMessage.trim() === "") {
      Alert.alert("Error", "Message cannot be empty.");
      return;
    }

    if (inviteStatus !== "active") {
      Alert.alert(
        "Error",
        "You can only send messages when the chat is active."
      );
      return;
    }

    try {
      const messageRef = collection(firestoreDB, `chats/${chatId}/messages`);
      const newMessageData = {
        text: newMessage,
        sender: auth.currentUser?.uid,
        createdAt: new Date(),
      };

      await addDoc(messageRef, newMessageData);
      setNewMessage(""); // Clear the input field after sending the message
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send the message.");
    }
  };

  // Handle Leave Chat
  const handleLeaveChat = async () => {
    try {
      if (!chatData || !chatData.users || !userId) return;

      // Check if the user is part of the chat
      if (!chatData.users.includes(userId)) {
        Alert.alert("Error", "You are not part of this chat.");
        return;
      }

      // Step 1: Remove user from chat's users array
      const updatedUsers = chatData.users.filter((id) => id !== userId);

      // Step 2: Add the user to the leftUsers array if they have not left already
      const updatedLeftUsers = chatData.leftUsers || [];
      if (!updatedLeftUsers.includes(userId)) {
        updatedLeftUsers.push(userId);
      }

      // Update the chat document with the modified users and leftUsers arrays
      const chatRef = doc(firestoreDB, `chats/${chatId}`);
      await updateDoc(chatRef, {
        users: updatedUsers,
        leftUsers: updatedLeftUsers, // Add the user to the leftUsers array
      });

      // Step 3: Remove chat from the user's chat list
      const userChatRef = doc(firestoreDB, `users/${userId}/chats/${chatId}`);
      await deleteDoc(userChatRef);

      // Optionally: If the chat is empty (no more users), you can set status to "inactive"
      if (updatedUsers.length === 0) {
        await updateDoc(chatRef, { status: "inactive" });
      }

      setHasLeft(true); // Mark the user as having left the chat

      Alert.alert("Success", "You have left the chat.");
      router.back();
    } catch (error) {
      console.error("Error leaving chat:", error);
      Alert.alert("Error", "Failed to leave the chat.");
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.message,
              item.sender === auth.currentUser?.uid
                ? styles.sentMessage
                : styles.receivedMessage,
            ]}
          >
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
      />
      {inviteStatus === "pending" && !isSender && (
        <Text style={styles.pendingStatus}>
          Invitation Pending <Icon name="spinner" size={14} color="gray" />
        </Text>
      )}
      {inviteStatus === "pending" && !isSender && (
        <Text style={styles.pendingMessage}>
          You can't send a message until the invite is accepted.
        </Text>
      )}

      {inviteStatus === "active" && !hasLeft && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message"
            value={newMessage}
            onChangeText={setNewMessage}
          />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowActionMenu((prev) => !prev)} // Toggle state
          >
            <Text style={styles.actionButtonText}>+</Text>
          </TouchableOpacity>
          {showActionMenu && (
            <View style={styles.actionMenu}>
              <TouchableOpacity
                onPress={() => {
                  setShowActionMenu(false);
                  handleLeaveChat();
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuText}>Leave Chat</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
      {inviteStatus === "pending" && !isSender && (
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
          <Text style={styles.buttonText}>Accept Invitation</Text>
        </TouchableOpacity>
      )}

      {inviteStatus === "pending" && isSender && (
        <Text style={styles.pendingMessage}>
          You can't send a message until the invite is accepted.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  menuText: {
    fontSize: 16,
    color: "#333",
  },
  actionMenu: {
    position: "absolute",
    bottom: 70,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 5,
    zIndex: 10,
    padding: 10,
  },

  actionButton: {
    marginLeft: 5,
    width: 40,
    height: 40,
    backgroundColor: "#0084FF",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontSize: 24,
    color: "#fff",
  },
  message: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
  },
  sentMessage: {
    backgroundColor: "#007bff",
    alignSelf: "flex-end",
  },
  receivedMessage: {
    backgroundColor: "grey",
    alignSelf: "flex-start",
  },
  messageText: {
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  sendButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
    marginLeft: 5,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  acceptButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  leaveButton: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  pendingStatus: {
    color: "gray",
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
  pendingMessage: {
    color: "gray",
    fontSize: 16,
    marginTop: 5,
    textAlign: "center",
  },
  backButton: {
    marginLeft: 10,
  },
});
