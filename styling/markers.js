import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  markerInfoContainer: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,

    alignItems: "center",
    zIndex: 1,
    paddingVertical: 10,
  },
  markerText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#000",
    padding: 5,
  },
  navContainer: {
    position: "absolute",
    bottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 15,
    paddingHorizontal: 15,
    elevation: 5,
  },
});

export default styles;
