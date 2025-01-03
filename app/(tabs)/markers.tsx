import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  Image,
  Button,
  StyleSheet,
} from "react-native";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { firestoreDB, auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import * as Location from "expo-location"; // Using Expo Location

interface NoteMarker {
  id: string;
  location: { latitude: number; longitude: number };
  noteText: string;
  imageUrl?: string;
}

const AllMarkersMap: React.FC = () => {
  const [markers, setMarkers] = useState<NoteMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentMarkerIndex, setCurrentMarkerIndex] = useState(0);
  const [initialRegion, setInitialRegion] = useState<Region>({
    latitude: 55.6761, // Default to Copenhagen, Denmark
    longitude: 12.5683,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const router = useRouter();
  let mapRef = React.useRef<MapView>(null);

  // authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        router.push("/login/LoginScreen");
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (userId) {
      fetchMarkers(userId);
    }
  }, [userId]);

  // Fetch markers from Firestore
  async function fetchMarkers(userId: string) {
    try {
      setLoading(true);
      const userNotesRef = collection(firestoreDB, `users/${userId}/notes`);
      const querySnapshot = await getDocs(userNotesRef);

      const loadedMarkers: NoteMarker[] = querySnapshot.docs
        .map((doc) => {
          const data = doc.data();
          if (data.location) {
            return {
              id: doc.id,
              location: data.location,
              noteText: data.text,
              imageUrl: data.imageUrl,
            };
          }
          return null;
        })
        .filter(Boolean);

      setMarkers(loadedMarkers as NoteMarker[]);
    } catch (error) {
      Alert.alert("Error fetching markers", error.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle the refresh of markers
  const handleRefresh = () => {
    if (userId) {
      fetchMarkers(userId);
    }
  };

  // Request location permission and set region
  useEffect(() => {
    const getUserLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "We need your location to show the map"
        );
        return;
      }

      // Get user location
      const location = await Location.getCurrentPositionAsync({});

      // Update the region to user's location
      setInitialRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    };

    getUserLocation();
  }, []);

  if (loading) {
    return (
      <ActivityIndicator size="large" color="#0000ff" style={{ flex: 1 }} />
    );
  }

  const handleMarkerPress = (markerId: string) => {
    console.log(markerId);
    router.push(`/note/${markerId}`);
  };

  const goToMarker = (index: number) => {
    if (markers.length > 0) {
      const marker = markers[index];
      if (mapRef.current && marker) {
        mapRef.current.animateToRegion(
          {
            latitude: marker.location.latitude,
            longitude: marker.location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          1000
        );
      }
    }
  };

  const handleNextMarker = () => {
    const newIndex = (currentMarkerIndex + 1) % markers.length;
    setCurrentMarkerIndex(newIndex);
    goToMarker(newIndex);
  };

  const handlePreviousMarker = () => {
    const newIndex = (currentMarkerIndex - 1 + markers.length) % markers.length;
    setCurrentMarkerIndex(newIndex);
    goToMarker(newIndex);
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsUserLocation={true}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.location.latitude,
              longitude: marker.location.longitude,
            }}
            onPress={() => handleMarkerPress(marker.id)}
          >
            <Callout onPress={() => handleMarkerPress(marker.id)}>
              <View>
                <Text>{marker.noteText}</Text>
                {marker.imageUrl && (
                  <Image
                    source={{ uri: marker.imageUrl }}
                    style={{ width: 50, height: 50, borderRadius: 5 }}
                  />
                )}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.navContainer}>
        <Button
          title="Previous"
          onPress={handlePreviousMarker}
          disabled={!markers.length}
        />
        <Text style={styles.markerText}>
          {markers.length
            ? `Viewing Marker ${currentMarkerIndex + 1} of ${markers.length}`
            : "No markers available"}
        </Text>
        <Button
          title="Next"
          onPress={handleNextMarker}
          disabled={!markers.length}
        />
        <Button title="Refresh" onPress={handleRefresh} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calloutContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 8,
    maxWidth: 200,
  },
  calloutText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 10,
  },
  calloutImage: {
    width: 40,
    height: 40,
    borderRadius: 5,
    resizeMode: "cover",
  },
  navContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Transparent black background
    borderRadius: 15,
    paddingHorizontal: 15,
    elevation: 5,
  },
  navButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: "#B0B0B0",
  },
  refreshButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  markerText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
});

export default AllMarkersMap;
