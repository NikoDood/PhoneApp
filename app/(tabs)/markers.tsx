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
import * as Location from "expo-location";
import {
  blue,
  rgbaArrayToRGBAColor,
} from "react-native-reanimated/lib/typescript/Colors";
import styles from "../../styling/markers";

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
  // Copenhagen, Denmark maps location
  const [initialRegion, setInitialRegion] = useState<Region>({
    latitude: 55.6761,
    longitude: 12.5683,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [locationPermissionStatus, setLocationPermissionStatus] =
    useState<string>("");

  const router = useRouter();
  let mapRef = React.useRef<MapView>(null);

  // authentication state (can be removed but im scared to mess up)
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

  // Fetch markers part
  async function fetchMarkers() {
    try {
      setLoading(true);
      const notesRef = collection(firestoreDB, "notes");
      const querySnapshot = await getDocs(notesRef);

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

  // Handle the refresh of markers when button clicked
  const handleRefresh = () => {
    if (userId) {
      handleLocationButtonClick();
      fetchMarkers(userId);
    }
  };

  // Request location permission and set region from device
  const getUserLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermissionStatus(status);

    if (status !== "granted") {
      Alert.alert("Permission denied", "We need your location to show the map");
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    setInitialRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  const handleLocationButtonClick = async () => {
    if (locationPermissionStatus !== "granted") {
      Alert.alert(
        "Location permission required",
        "Please enable location services to use this feature.",
        [
          {
            text: "Cancel",
            onPress: () => {},
            style: "cancel",
          },
          {
            text: "Enable",
            onPress: getUserLocation,
          },
        ]
      );
    } else {
      // Already granted permission and just update location so user dont have to do it again :)
      await getUserLocation();
    }
  };

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
      {/* Text container for marker info at the top of the screen */}
      <View style={styles.markerInfoContainer}>
        <Text style={styles.markerText}>
          {markers.length
            ? `Viewing Marker ${currentMarkerIndex + 1} of ${markers.length}`
            : "No markers available"}
        </Text>
      </View>

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
        <Button
          title="Next"
          onPress={handleNextMarker}
          disabled={!markers.length}
        />
        <Button title="Refresh" onPress={handleRefresh} />
        <Button title="Get Location" onPress={handleLocationButtonClick} />
      </View>
    </View>
  );
};

export default AllMarkersMap;
