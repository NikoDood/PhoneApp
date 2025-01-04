import { StyleSheet } from "react-native";

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
    backgroundColor: "#f0f0f0",
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

export default styles;
