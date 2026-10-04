import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();

  const [battery, setBattery] = useState(18);
  const [connector, setConnector] = useState("CCS2");

  const [validationError, setValidationError] = useState("");

  const [location, setLocation] =
    useState<Location.LocationObject | null>(null);

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationName, setLocationName] = useState("");

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      setLocationError("");
      setValidationError("");
      setLocationName("");

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationError(
          "Location permission is required to find nearby charging stations.",
        );
        setLocation(null);
        return;
      }

      const currentLocation =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      setLocation(currentLocation);

      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        if (address) {
          const locality = address.district || address.subregion;
          const city = address.city || address.region;

          const parts = [...new Set(
            [locality, city].filter(Boolean)
          )];

          setLocationName(
            parts.length > 0 ? parts.join(", ") : "Current Location"
          );
        }
      } catch {
        setLocationName("");
      }
    } catch {
      setLocation(null);
      setLocationError("Unable to get your current location.");
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const handleSearch = () => {
    setValidationError("");

    if (battery < 0 || battery > 100) {
      setValidationError(
        "Battery level must be between 0 and 100.",
      );
      return;
    }

    if (!location) {
      setValidationError(
        "Please allow location access before searching.",
      );
      return;
    }

    router.push({
      pathname: "/results",
      params: {
        latitude: String(location.coords.latitude),
        longitude: String(location.coords.longitude),
        battery: String(battery),
        connector,
      },
    });
  };

  const getBatteryLabel = () => {
    if (battery <= 20) return "Low";
    if (battery <= 50) return "Moderate";
    if (battery <= 80) return "Good";
    return "High";
  };

  const getBatteryColor = () => {
    if (battery <= 20) return Colors.error;
    if (battery <= 50) return "#F59E0B";
    return Colors.primary;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>EV CHARGE FINDER</Text>

          <Text style={styles.title}>
            Find a charging station
          </Text>

          <Text style={styles.subtitle}>
            We'll find stations that match your vehicle
            and current location.
          </Text>
        </View>
      </View>

      {/* Location */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="location"
                size={16}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.sectionTitle}>
              Your location
            </Text>
          </View>

          <Text style={styles.sectionHint}>
            Required
          </Text>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationMain}>
            <View
              style={[
                styles.locationStatusIcon,
                location && styles.locationStatusIconSuccess,
              ]}
            >
              <Ionicons
                name={
                  location
                    ? "checkmark"
                    : locationLoading
                      ? "locate"
                      : "location-outline"
                }
                size={21}
                color={
                  location
                    ? Colors.primary
                    : Colors.textSecondary
                }
              />
            </View>

            <View style={styles.locationContent}>
              {locationLoading ? (
                <>
                  <Text style={styles.locationTitle}>
                    Detecting location
                  </Text>

                  <Text style={styles.locationSubtitle}>
                    Getting your current position...
                  </Text>
                </>
              ) : location ? (
                <>
                  <Text style={styles.locationTitle}>
                    Location detected
                  </Text>

                  <Text style={styles.locationSubtitle} numberOfLines={1}>
                    {locationName ||
                      `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.locationTitle}>
                    Location unavailable
                  </Text>

                  <Text style={styles.locationSubtitle}>
                    Enable location to find nearby stations.
                  </Text>
                </>
              )}
            </View>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
              />
            ) : (
              <Ionicons
                name="refresh"
                size={18}
                color={Colors.primary}
              />
            )}
          </Pressable>
        </View>
      </View>

      {/* Battery */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="battery-half"
                size={16}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.sectionTitle}>
              Battery level
            </Text>
          </View>

          <View style={styles.batteryBadge}>
            <Text
              style={[
                styles.batteryBadgeText,
                { color: getBatteryColor() },
              ]}
            >
              {getBatteryLabel()}
            </Text>
          </View>
        </View>

        <View style={styles.batteryCard}>
          <View style={styles.batteryValueRow}>
            <Text style={styles.batteryValue}>
              {battery}%
            </Text>

            <Text style={styles.batteryDescription}>
              Current battery
            </Text>
          </View>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={battery}
            onValueChange={setBattery}
            minimumTrackTintColor={getBatteryColor()}
            maximumTrackTintColor={Colors.surfaceElevated}
            thumbTintColor={getBatteryColor()}
          />

          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>0%</Text>
            <Text style={styles.sliderLabel}>50%</Text>
            <Text style={styles.sliderLabel}>100%</Text>
          </View>
        </View>
      </View>

      {/* Connector */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="flash"
                size={16}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.sectionTitle}>
              Connector type
            </Text>
          </View>
        </View>

        <View style={styles.connectorContainer}>
          {(["CCS2", "Type2", "Bharat DC"] as const).map(
            (type) => {
              const selected = connector === type;

              return (
                <Pressable
                  key={type}
                  style={[
                    styles.connectorButton,
                    selected &&
                      styles.selectedConnector,
                  ]}
                  onPress={() => setConnector(type)}
                >
                  <View
                    style={[
                      styles.connectorIcon,
                      selected &&
                        styles.selectedConnectorIcon,
                    ]}
                  >
                    <Ionicons
                      name="flash"
                      size={15}
                      color={
                        selected
                          ? Colors.background
                          : Colors.textSecondary
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.connectorText,
                      selected && styles.selectedText,
                    ]}
                  >
                    {type}
                  </Text>

                  {selected && (
                    <View style={styles.checkIcon}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={Colors.background}
                      />
                    </View>
                  )}
                </Pressable>
              );
            },
          )}
        </View>
      </View>

      {/* Errors */}
      {(validationError || locationError) && (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={Colors.error}
          />

          <Text style={styles.errorText}>
            {validationError || locationError}
          </Text>
        </View>
      )}

      {/* Search */}
      <Pressable
        style={[
          styles.searchButton,
          (!location || locationLoading) &&
            styles.disabledButton,
        ]}
        disabled={!location || locationLoading}
        onPress={handleSearch}
      >
        <Text style={styles.searchButtonText}>
          FIND STATIONS
        </Text>

        <View style={styles.searchButtonIcon}>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={Colors.background}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: Colors.background,
  },

  header: {
    marginBottom: 24,
  },

  eyebrow: {
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: Colors.primary,
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  subtitle: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },

  section: {
    marginBottom: 22,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  sectionHint: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },

  locationCard: {
    minHeight: 76,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  locationMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  locationStatusIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },

  locationStatusIconSuccess: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },

  locationContent: {
    flex: 1,
    marginLeft: 12,
  },

  locationTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  locationSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.textSecondary,
  },

  refreshButton: {
    width: 40,
    height: 40,
    marginLeft: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  batteryCard: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  batteryValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },

  batteryValue: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  batteryDescription: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  batteryBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },

  batteryBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  slider: {
    width: "100%",
    height: 40,
    marginTop: 4,
  },

  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  sliderLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },

  connectorContainer: {
    gap: 8,
  },

  connectorButton: {
    minHeight: 58,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
    flexDirection: "row",
    alignItems: "center",
  },

  selectedConnector: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  connectorIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },

  selectedConnectorIcon: {
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  connectorText: {
    marginLeft: 11,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textSecondary,
  },

  selectedText: {
    color: Colors.background,
  },

  checkIcon: {
    marginLeft: "auto",
  },

  errorContainer: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.error,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.error,
  },

  searchButton: {
    height: 54,
    marginTop: "auto",
    marginBottom: 20,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.45,
  },

  searchButtonText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.4,
    color: Colors.background,
  },

  searchButtonIcon: {
    width: 30,
    height: 30,
    marginLeft: 10,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
});
