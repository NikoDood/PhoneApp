import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  container2: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  flatListContainer: {
    height: "70%",
  },
  noteContainer: {
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  noteText: {
    fontSize: 16,
    color: "#333",
  },
  noteImage: {
    width: "100%",
    height: 100,
    marginTop: 10,
    borderRadius: 8,
    resizeMode: "cover",
  },
  inputSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginRight: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    backgroundColor: "#0084FF",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  actionButtonText: {
    fontSize: 24,
    color: "#fff",
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
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  menuText: {
    fontSize: 16,
    color: "#333",
  },
  addNoteButton: {
    backgroundColor: "#0084FF",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  addNoteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  previewContainer: {
    padding: 10,
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  imagePreview: {
    width: 50,
    height: 50,
    marginBottom: 10,
    borderRadius: 10,
  },
  removePreview: {
    fontSize: 14,
    color: "red",
  },
});

export default styles;
