import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { getStations } from "@/services/api";
import { Colors } from "@/constants/colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

type Station = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance?: number;
  power: number;
  available_slots?: number;
  total_slots?: number;
  wait_time?: number;
};

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState<Station[]>([]);
  const [error, setError] = useState("");

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const loadStations = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getStations();

      setStations(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load stations",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setError("Location permission denied");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      setError("Failed to get your location");
    }
  };

  useEffect(() => {
    loadStations();
    loadLocation();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />

        <Text style={styles.loadingText}>Loading stations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EV Charging Allocation</Text>

      <Text style={styles.subtitle}>Smart charging station management</Text>

      <Pressable
        style={({ pressed }) => [
          styles.ctaCard,
          pressed && styles.ctaCardPressed,
        ]}
        onPress={() => router.push("/explore")}
      >
        <View style={styles.ctaIconCircle}>
          <IconSymbol
            name="paperplane.fill"
            size={22}
            color={Colors.background}
          />
        </View>

        <View style={styles.ctaTextGroup}>
          <Text style={styles.ctaTitle}>Find a Charging Station</Text>

          <Text style={styles.ctaSubtitle}>
            Search nearby stations by battery level and connector
          </Text>
        </View>

        <IconSymbol name="chevron.right" size={20} color={Colors.background} />
      </Pressable>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setError("");
              loadLocation();
              loadStations();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : location ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 1,
              longitudeDelta: 1,
            }}
          >
            {/* Current user location */}
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="You are here"
            >
              <View style={styles.userMarker}>
                <Ionicons name="car" size={16} color="#FFFFFF" />
              </View>
            </Marker>

            {/* Charging stations */}
            {stations.map((station) => {
              const isAvailable =
                station.available_slots === undefined ||
                station.available_slots > 0;

              return (
                <Marker
                  key={station.id}
                  coordinate={{
                    latitude: Number(station.latitude),
                    longitude: Number(station.longitude),
                  }}
                  title={station.name}
                  description={`${station.power} kW`}
                  onPress={() => router.push(`/station/${station.id}`)}
                >
                  <View
                    style={[
                      styles.stationMarker,
                      {
                        backgroundColor: isAvailable ? "#16A34A" : "#DC2626",
                      },
                    ]}
                  >
                    <Ionicons name="flash" size={15} color="#FFFFFF" />
                  </View>
                </Marker>
              );
            })}
          </MapView>
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={Colors.primary} />

          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: Colors.background,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.background,
  },

  title: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 24,
    fontSize: 14,
    color: Colors.textSecondary,
  },

  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    marginBottom: 28,
  },

  ctaCardPressed: {
    opacity: 0.85,
  },

  ctaIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryDark,
  },

  ctaTextGroup: {
    flex: 1,
  },

  ctaTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.background,
  },

  ctaSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.background,
    opacity: 0.85,
  },

  mapContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  map: {
    flex: 1,
  },

  /*
   * Current user marker
   */
  userMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 5,
  },
  
  stationMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 4,
  },

  loadingText: {
    color: Colors.textSecondary,
  },

  errorText: {
    color: Colors.error,
    fontSize: 15,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },

  retryButtonText: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },
});
