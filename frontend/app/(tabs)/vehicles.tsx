import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import { getUserVehicles } from "@/services/api";
import { Colors } from "@/constants/colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadVehicles = async () => {
    try {
      setError("");
      setLoading(true);

      const data = await getUserVehicles(1);

      setVehicles(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load vehicles",
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, []),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Vehicles</Text>

      <Text style={styles.subtitle}>Manage your electric vehicles</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={vehicles}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <IconSymbol name="car.fill" size={32} color={Colors.primary} />
            </View>

            <Text style={styles.emptyTitle}>No vehicles yet</Text>

            <Text style={styles.empty}>
              Add your EV to get personalized charging station
              recommendations.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardIconCircle}>
              <IconSymbol name="car.fill" size={22} color={Colors.primary} />
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.vehicleName} numberOfLines={1}>
                  {item.brand} {item.model}
                </Text>

                <View style={styles.regChip}>
                  <Text style={styles.regChipText}>
                    {item.registration_number}
                  </Text>
                </View>
              </View>

              <View style={styles.batteryRow}>
                <IconSymbol
                  name="bolt.fill"
                  size={14}
                  color={Colors.textSecondary}
                />

                <Text style={styles.battery}>
                  {item.battery_capacity} kWh battery
                </Text>
              </View>
            </View>
          </View>
        )}
      />

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => router.push("/add-vehicle")}
      >
        <IconSymbol name="plus" size={18} color={Colors.background} />
        <Text style={styles.buttonText}>ADD VEHICLE</Text>
      </Pressable>
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
    marginBottom: 20,
    color: Colors.textSecondary,
  },

  list: {
    flexGrow: 1,
    gap: 14,
    paddingBottom: 100,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceElevated,
  },

  cardBody: {
    flex: 1,
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  vehicleName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  regChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },

  regChipText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: Colors.primary,
  },

  batteryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },

  battery: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  emptyState: {
    marginTop: 40,
    alignItems: "center",
    paddingHorizontal: 16,
  },

  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 6,
  },

  empty: {
    textAlign: "center",
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  error: {
    marginBottom: 12,
    color: Colors.error,
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    padding: 17,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },

  buttonPressed: {
    opacity: 0.85,
  },

  buttonText: {
    fontWeight: "800",
    color: Colors.background,
  },
});
