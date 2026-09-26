import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import { getStationById, allocateStation } from "@/services/api";
import { Colors } from "@/constants/colors";

type Station = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  connectorTypes: string[];
  power: number;
  availableSlots: number;
  totalSlots: number;
  waitTime: number;
  trustScore: number;
};

type Allocation = {
  allocationId: string;
  stationId: string;
  stationName: string;
  status: string;
};

export default function StationDetailScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [allocating, setAllocating] = useState(false);
  const [allocationError, setAllocationError] = useState("");
  const [allocation, setAllocation] = useState<Allocation | null>(null);

  const loadStation = async () => {
    try {
      setLoading(true);
      setError("");

      if (!id) {
        throw new Error("Station ID is missing");
      }

      const data = await getStationById(id);

      setStation(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load station",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStation();
  }, [id]);

  const handleAllocate = async () => {
    if (!station || station.availableSlots <= 0 || allocation) {
      return;
    }

    try {
      setAllocating(true);
      setAllocationError("");

      const data = await allocateStation(station.id);

      setStation(data.station);
      setAllocation(data.allocation);
    } catch (error) {
      setAllocationError(
        error instanceof Error
          ? error.message
          : "Failed to allocate charging slot",
      );
    } finally {
      setAllocating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />

        <Text style={styles.loadingText}>Loading station details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!station) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Station not found</Text>
      </View>
    );
  }

  const isAvailable = station.availableSlots > 0;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: station.name,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Station Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{station.name}</Text>

          <View
            style={[
              styles.statusBadge,
              isAvailable ? styles.availableBadge : styles.unavailableBadge,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                isAvailable ? styles.availableDot : styles.unavailableDot,
              ]}
            />

            <Text
              style={[
                styles.statusText,
                isAvailable ? styles.availableText : styles.unavailableText,
              ]}
            >
              {isAvailable ? "Available" : "No Slots"}
            </Text>
          </View>
        </View>

        {/* Charger Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>⚡ Charger Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Connector</Text>

            <Text style={styles.infoValue}>
              {station.connectorTypes?.join(", ")}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Charging Power</Text>

            <Text style={styles.powerValue}>{station.power} kW</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Waiting Time</Text>

            <Text style={styles.infoValue}>{station.waitTime} min</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Available Ports</Text>

            <Text
              style={[
                styles.infoValue,
                isAvailable ? styles.availableText : styles.unavailableText,
              ]}
            >
              {station.availableSlots} / {station.totalSlots}
            </Text>
          </View>
        </View>

        {/* Trust Score */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📊 Station Trust</Text>

          <View style={styles.trustRow}>
            <View>
              <Text style={styles.trustLabel}>Trust Score</Text>

              <Text style={styles.trustStars}>
                {"★".repeat(station.trustScore)}
                {"☆".repeat(5 - station.trustScore)}
              </Text>
            </View>

            <Text style={styles.trustScore}>{station.trustScore}/5</Text>
          </View>
        </View>

        {/* Allocation Success */}
        {allocation && (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>✓ Charging Slot Allocated</Text>

            <Text style={styles.successText}>
              Your charging slot has been successfully allocated.
            </Text>

            <View style={styles.allocationInfo}>
              <Text style={styles.allocationLabel}>Allocation ID</Text>

              <Text style={styles.allocationValue}>
                {allocation.allocationId}
              </Text>
            </View>

            <View style={styles.allocationInfo}>
              <Text style={styles.allocationLabel}>Station</Text>

              <Text style={styles.allocationValue}>
                {allocation.stationName}
              </Text>
            </View>

            <View style={styles.allocationInfo}>
              <Text style={styles.allocationLabel}>Status</Text>

              <Text style={styles.allocationStatus}>{allocation.status}</Text>
            </View>
          </View>
        )}

        {/* Allocation Error */}
        {allocationError ? (
          <View style={styles.allocationError}>
            <Text style={styles.allocationErrorText}>{allocationError}</Text>
          </View>
        ) : null}

        {/* Allocate Button */}
        <Pressable
          style={[
            styles.allocateButton,
            (!isAvailable || allocation) && styles.disabledButton,
          ]}
          disabled={!isAvailable || allocating || !!allocation}
          onPress={handleAllocate}
        >
          {allocating ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text
              style={[
                styles.allocateButtonText,
                (!isAvailable || allocation) && styles.disabledButtonText,
              ]}
            >
              {allocation
                ? "SLOT ALLOCATED"
                : isAvailable
                  ? "ALLOCATE CHARGING SLOT"
                  : "NO SLOTS AVAILABLE"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  container: {
    flex: 1,
  },

  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.background,
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
  },

  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  availableBadge: {
    backgroundColor: Colors.surfaceElevated,
  },

  unavailableBadge: {
    backgroundColor: Colors.surfaceElevated,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },

  availableDot: {
    backgroundColor: Colors.primary,
  },

  unavailableDot: {
    backgroundColor: Colors.error,
  },

  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },

  availableText: {
    color: Colors.primary,
  },

  unavailableText: {
    color: Colors.error,
  },

  card: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 14,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },

  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    textAlign: "right",
    maxWidth: "60%",
  },

  powerValue: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.secondary,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.surfaceElevated,
    marginVertical: 8,
  },

  trustRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  trustLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  trustStars: {
    marginTop: 6,
    fontSize: 18,
    letterSpacing: 2,
    color: Colors.primary,
  },

  trustScore: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.primary,
  },

  successCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 16,
  },

  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 8,
  },

  successText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },

  allocationInfo: {
    marginTop: 10,
  },

  allocationLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  allocationValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },

  allocationStatus: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "800",
    color: Colors.primary,
  },

  allocationError: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },

  allocationErrorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },

  allocateButton: {
    marginTop: 4,
    padding: 17,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },

  allocateButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: "800",
  },

  disabledButton: {
    backgroundColor: Colors.surfaceElevated,
  },

  disabledButtonText: {
    color: Colors.textSecondary,
  },

  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
  },

  errorText: {
    color: Colors.error,
    fontSize: 16,
    textAlign: "center",
  },

  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
