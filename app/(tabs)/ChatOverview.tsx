import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  useWindowDimensions,
} from "react-native";
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  where,
  query,
  getDocs,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { firestoreDB, auth } from "../../services/firebase";
import { useRouter } from "expo-router";
import { Notifications } from "react-native-notifications";
import Icon from "react-native-vector-icons/FontAwesome"; // Make sure this import is correct
import { TabView, SceneMap } from "react-native-tab-view";

const FirstRoute = () => {
  const [chats, setChats] = React.useState([]);

  React.useEffect(() => {
    const chatsRef = collection(firestoreDB, `chats`);
    const q = query(
      chatsRef,
      where("leftUsers", "array-contains", auth.currentUser?.uid)
    );

    // Subscribe to real-time updates using onSnapshot
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const chatsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log(chatsData); // Logs the current state of the chats
        setChats(chatsData); // Update the state with the new data
      },
      (error) => {
        console.error("Error fetching chats:", error);
        Alert.alert("Error", "Failed to load chats.");
      }
    );

    // Cleanup the listener when the component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  const handleRejoinChat = async (chatId: string) => {
    try {
      const chatRef = doc(firestoreDB, `chats/${chatId}`);
      const chatDoc = await getDoc(chatRef);

      if (!chatDoc.exists()) {
        Alert.alert("Error", "Chat does not exist.");
        return;
      }

      const chatData = chatDoc.data();
      if (!chatData.users || chatData.users.includes(auth.currentUser?.uid)) {
        Alert.alert("Error", "You are already part of this chat.");
        return;
      }

      await updateDoc(chatRef, {
        users: [...chatData.users, auth.currentUser?.uid],
        leftUsers: chatData.leftUsers.filter(
          (id) => id !== auth.currentUser?.uid
        ),
      });

      const userChatRef = doc(
        firestoreDB,
        `users/${auth.currentUser?.uid}/chats`,
        chatId
      );
      await setDoc(userChatRef, {
        chatId: chatId,
        otherUser: chatData.userEmails.find(
          (email) => email !== auth.currentUser?.email
        ),
      });

      Alert.alert("Success", "You have rejoined the chat.");
    } catch (error) {
      console.error("Error rejoining chat:", error);
      Alert.alert("Error", "Failed to rejoin the chat.");
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.chatItem}>
            <Text style={styles.chatText}>
              {
                item?.userEmails.filter(
                  (email) => email !== auth.currentUser?.email
                )[0]
              }
            </Text>
            <TouchableOpacity
              style={styles.rejoinButton}
              onPress={() => handleRejoinChat(item.id)}
            >
              <Text style={styles.buttonText}>Rejoin</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

interface Chat {
  id: string;
  chatId: string;
  otherUser: string;
  status: string;
  name?: string;
  profileImg?: string;
  userEmails?: [];
}

const SecondRoute = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!auth.currentUser
  );
  const [leavedChats, setLeavedChats] = useState<Chat[]>([]);
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

    const fetchLeavedChats = async () => {
      try {
        const chatsRef = collection(firestoreDB, `chats`);
        const q = query(
          chatsRef,
          where("leftUsers", "array-contains", auth.currentUser?.uid)
        );
        const querySnapshot = await getDocs(q);

        const leavedChatsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLeavedChats(leavedChatsData);
        console.log(leavedChats);
      } catch (error) {
        console.error("Error fetching leaved chats:", error);
        Alert.alert("Error", "Failed to load leaved chats.");
      }
    };

    fetchLeavedChats();
  }, [isAuthenticated]);

  const handleRejoinChat = async (chatId: string) => {
    try {
      // Get the reference to the chat document
      const chatRef = doc(firestoreDB, `chats/${chatId}`);

      // Fetch the chat document
      const chatDoc = await getDoc(chatRef);

      // Check if the document exists
      if (!chatDoc.exists()) {
        Alert.alert("Error", "Chat does not exist.");
        return;
      }

      const chatData = chatDoc.data(); // Access the data of the chat document

      // Check if the user is already in the chat
      if (!chatData.users || chatData.users.includes(auth.currentUser?.uid)) {
        Alert.alert("Error", "You are already part of this chat.");
        return;
      }

      // Rejoin the chat by adding the user back to the users array
      await updateDoc(chatRef, {
        users: [...chatData.users, auth.currentUser?.uid], // Add the user back to the chat
        leftUsers: chatData.leftUsers.filter(
          (id) => id !== auth.currentUser?.uid
        ), // Remove the user from leftUsers
      });

      // Add the chat back to the user's chat list
      const userChatRef = doc(
        firestoreDB,
        `users/${auth.currentUser?.uid}/chats`,
        chatId
      );
      await setDoc(userChatRef, {
        chatId: chatId,
        otherUser: chatData.userEmails.find(
          (email) => email !== auth.currentUser?.email
        ), // Get the other user's email
      });

      Alert.alert("Success", "You have rejoined the chat.");
    } catch (error) {
      console.error("Error rejoining chat:", error);
      Alert.alert("Error", "Failed to rejoin the chat.");
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !auth.currentUser) return;

    const unsubscribe = onSnapshot(
      collection(firestoreDB, `users/${auth.currentUser.uid}/chats`),
      async (snapshot) => {
        const chatPromises = snapshot.docs.map(async (doc) => {
          const chatData = doc.data() as Chat;
          const otherUserId = chatData.otherUser;

          const otherUserDoc = await getDocs(
            query(
              collection(firestoreDB, "users"),
              where("email", "==", otherUserId)
            )
          );

          if (!otherUserDoc.empty) {
            const otherUserData = otherUserDoc.docs[0].data();

            // Add status field to chat data
            return {
              ...chatData,
              name: otherUserData.name || otherUserData.email,
              profileImg: otherUserData.profileImg || null,
              status: otherUserData.status, // Add online/offline status
            };
          }

          return chatData;
        });

        const chatData = await Promise.all(chatPromises);
        setChats(chatData);
      },
      (error) => {
        console.error("Error fetching chats:", error);
        if (isAuthenticated) {
          Alert.alert("Error", "Failed to load chats.");
        }
      }
    );

    return () => unsubscribe();
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
      const invitedUserEmail = querySnapshot.docs[0].data().email;

      const combinedId =
        auth.currentUser?.uid! < invitedUserId
          ? `${auth.currentUser?.uid}-${invitedUserId}`
          : `${invitedUserId}-${auth.currentUser?.uid}`;

      // Create a chat reference in Firestore
      const chatRef = doc(firestoreDB, `chats`, combinedId);
      await setDoc(chatRef, {
        users: [auth.currentUser?.uid, invitedUserId],
        createdAt: new Date(),
        status: "pending", // Set status to pending when creating the chat
        userEmails: [auth.currentUser?.email, invitedUserEmail], // Add emails to chat document
      });

      await Promise.all(
        [auth.currentUser?.uid!, invitedUserId].map((userId) =>
          setDoc(doc(firestoreDB, `users/${userId}/chats`, combinedId), {
            chatId: combinedId,
            otherUser:
              userId === auth.currentUser?.uid
                ? invitedUserEmail
                : auth.currentUser?.email,
          })
        )
      );

      const inviteRef = doc(firestoreDB, `invites`, combinedId);
      await setDoc(inviteRef, {
        from: auth.currentUser?.uid,
        fromEmail: auth.currentUser?.email,
        toEmail: invitedUserEmail,
        to: invitedUserId,
        chatId: combinedId,
        status: "pending", // Set status to pending in invite document
      });

      Alert.alert("Success", "Chat invitation sent successfully!");
    } catch (error) {
      console.error("Error inviting user:", error);
      Alert.alert("Error", "Failed to invite user.");
    }
  };

  const openChat = (chatId: string, status: string) => {
    if (status === "pending") {
      Alert.alert(
        "Chat Pending",
        "You can't open this chat until it's accepted."
      );
      return;
    }
    router.push(`/chat/${chatId}`);
  };

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={[
        styles.chatItem,
        item.status === "pending" && styles.pendingChat, // Apply background for pending chats
      ]}
      onPress={() => openChat(item.chatId, item.status)} // Pass status to handle pending state
      disabled={item.status === "pending"} // Disable the chat if status is pending
    >
      <Image
        source={
          item.profileImg
            ? { uri: item.profileImg }
            : require("../../assets/images/coop_notes_logo.jpg")
        }
        style={styles.profileImg}
      />

      <View style={styles.chatTextContainer}>
        {item.name ? (
          <Text style={styles.chatText}>
            {item.name}{" "}
            {item.status === "online" && (
              <Icon
                name="circle"
                size={16}
                color="green"
                style={styles.onlineIcon}
              />
            )}
          </Text>
        ) : (
          <Text style={styles.chatText}>
            {item.otherUser}{" "}
            {item.status === "online" && (
              <Icon
                name="circle"
                size={16}
                color="green"
                style={styles.onlineIcon}
              />
            )}
          </Text>
        )}

        {/* Show green circle if the user is online */}

        {item.status === "pending" && (
          <Icon
            name="spinner"
            size={16}
            color="gray"
            style={styles.pendingIcon}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chats</Text>

      <FlatList
        data={chats}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderChatItem}
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
};

const renderScene = SceneMap({
  first: FirstRoute,
  second: SecondRoute,
});

export default function ChatOverview() {
  const layout = useWindowDimensions();
  const [index, setIndex] = React.useState(0);

  const routes = [
    { key: "second", title: "Chats" },
    { key: "first", title: "Left Chats" },
  ];

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={{ width: layout.width }}
    />
  );
}

const styles = StyleSheet.create({
  // Add the styles for your new "Leaved Chats" section
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
    flexDirection: "row",
    alignItems: "center",
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
  rejoinButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  onlineIcon: {
    marginLeft: 10,
    alignSelf: "center",
  },
  pendingIcon: {
    marginLeft: 10,
    alignSelf: "center",
  },

  dingChat: {
    backgroundColor: "#f0f0f0", // Change background for pending chats
  },
  profileImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  chatTextContainer: {
    flex: 1,
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
});
