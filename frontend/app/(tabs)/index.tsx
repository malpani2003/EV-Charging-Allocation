import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { getStations } from "@/services/api";
import { Colors } from "@/constants/colors";
import * as Location from "expo-location";
import { Map, UserLocation, Marker, Camera } from "@maplibre/maplibre-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Module-level so it persists across re-renders and counts actual map
// style/tile loads (what MapTiler's free-tier quota bills), not React renders.
let mapLoadCount = 0;

type Station = {
  id: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
  distance?: number;
  power: number;
  available_slots?: number;
  total_slots?: number;
  wait_time?: number;
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState<Station[]>([]);
  const [error, setError] = useState("");

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const loadStations = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getStations();

      setStations(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load stations");
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

      // getCurrentPositionAsync can hang indefinitely on Android (expo/expo#39851,
      // expo/expo#33981) and its own `timeout` option is unreliable (expo/expo#2226),
      // so a cached last-known fix is tried first and a manual race caps the fresh fix.
      const lastKnown = await Location.getLastKnownPositionAsync();

      if (lastKnown) {
        setLocation({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        });
        return;
      }

      const currentLocation = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("LOCATION_TIMEOUT")), 10000)
        ),
      ]);

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

  const getStationColor = (availableSlots?: number) => {
    if (!availableSlots || availableSlots === 0) {
      return "#EF4444";
    }

    if (availableSlots === 1) {
      return "#F59E0B";
    }

    return Colors.primary;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />

        <Text style={styles.loadingText}>Loading stations...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>⚡ EV Charge Finder</Text>

          <Text style={styles.subtitle}>Find a charger near you</Text>
        </View>

        <Pressable style={styles.profileButton}>
          <Ionicons name="person-outline" size={20} color={Colors.textPrimary} />
        </Pressable>
      </View>

      {/* Search */}
      <Pressable style={styles.searchBar} onPress={() => router.push("/explore")}>
        <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />

        <Text style={styles.searchText}>Search charging stations</Text>
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
          <Map
            style={styles.map}
            mapStyle={`https://api.maptiler.com/maps/streets-v4/style.json?key=${process.env.EXPO_PUBLIC_MAPTILER_API_KEY}`}
            androidView="texture"
            logo={false}
            attribution={true}
            onDidFinishLoadingMap={() => {
              mapLoadCount += 1;
              console.log(`[MapLibre] Map style load #${mapLoadCount} (counts toward MapTiler monthly quota)`);
            }}
          >
            {/* Camera */}
            <Camera trackUserLocation="default" zoom={12} />

            {/* Current location */}
            <UserLocation animated={true} />

            {/* Charging stations */}
            {stations.map((station) => (
              <Marker
                key={station.id}
                id={`station-${station.id}`}
                lngLat={[Number(station.longitude), Number(station.latitude)]}
                onPress={() => setSelectedStation(station)}
              >
                <View
                  style={[
                    styles.stationMarker,
                    {
                      backgroundColor: getStationColor(station.available_slots),
                    },
                  ]}
                >
                  <Ionicons name="flash" size={16} color="#FFFFFF" />
                </View>
              </Marker>
            ))}
          </Map>

          {/* Station Details */}
          {selectedStation && (
            <View style={styles.stationDetailsCard}>
              <View style={styles.stationDetailsHeader}>
                <View style={styles.stationDetailsTitleContainer}>
                  <View
                    style={[
                      styles.stationDetailsIcon,
                      {
                        backgroundColor: getStationColor(selectedStation.available_slots),
                      },
                    ]}
                  >
                    <Ionicons name="flash" size={20} color="#FFFFFF" />
                  </View>

                  <View style={styles.stationDetailsTitle}>
                    <Text style={styles.stationName} numberOfLines={2}>
                      {selectedStation.name}
                    </Text>

                    <Text style={styles.stationPower}>{selectedStation.power} kW charger</Text>
                  </View>
                </View>

                <Pressable onPress={() => setSelectedStation(null)} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.stationStats}>
                <View style={styles.statItem}>
                  <Ionicons name="flash-outline" size={18} color={Colors.primary} />

                  <Text style={styles.statValue}>
                    {selectedStation.available_slots ?? 0}/{selectedStation.total_slots ?? 0}
                  </Text>

                  <Text style={styles.statLabel}>Slots</Text>
                </View>

                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={18} color={Colors.primary} />

                  <Text style={styles.statValue}>{selectedStation.wait_time ?? 0} min</Text>

                  <Text style={styles.statLabel}>Wait</Text>
                </View>
              </View>

              <Pressable
                style={styles.viewStationButton}
                onPress={() => {
                  setSelectedStation(null);
                  router.push(`/station/${selectedStation.id}`);
                }}
              >
                <Text style={styles.viewStationButtonText}>View Station</Text>

                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          )}
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
    padding: 20,
    backgroundColor: Colors.background,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.background,
  },

  header: {
    marginTop: 20,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },

  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  searchBar: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
    marginBottom: 16,
  },

  searchText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  mapContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  map: {
    flex: 1,
  },

  stationMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 5,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },

  stationDetailsCard: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
    elevation: 10,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  stationDetailsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  stationDetailsTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  stationDetailsIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  stationDetailsTitle: {
    flex: 1,
    marginLeft: 12,
  },

  stationName: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  stationPower: {
    marginTop: 3,
    fontSize: 13,
    color: Colors.textSecondary,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },

  stationStats: {
    flexDirection: "row",
    marginTop: 16,
    gap: 24,
  },

  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  viewStationButton: {
    height: 46,
    marginTop: 16,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  viewStationButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
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
