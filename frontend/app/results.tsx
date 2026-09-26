import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ChargingStationCard from "@/components/charging-station-card";
import { Colors } from "@/constants/colors";
import { useStations } from "@/hooks/useStations";

type SortOption = "score" | "distance" | "wait" | "power";

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
  distance: number;
  score: number;
};

export default function ResultsScreen() {
  const [sortBy, setSortBy] = useState<SortOption>("score");

  const { latitude, longitude, battery, connector } = useLocalSearchParams<{
    latitude?: string;
    longitude?: string;
    battery?: string;
    connector?: string;
  }>();

  const { stations, loading, error } = useStations({
    latitude: Number(latitude),
    longitude: Number(longitude),
    battery: Number(battery ?? 0),
    connector: connector ?? "",
  });

  const renderStation = useCallback(
    ({ item, index }: { item: Station; index: number }) => (
      <ChargingStationCard
        station={item}
        rank={index + 1}
        onPress={() => {
          router.push(`/station/${item.id}`);
        }}
      />
    ),
    [],
  );

  /*
   * Sort stations based on the selected option.
   *
   * useMemo prevents sorting again when
   * unrelated state changes.
   */
  const sortedStations = useMemo(() => {
    const sorted = [...stations];

    switch (sortBy) {
      case "distance":
        return sorted.sort((a, b) => a.distance - b.distance);

      case "wait":
        return sorted.sort((a, b) => a.waitTime - b.waitTime);

      case "power":
        return sorted.sort((a, b) => b.power - a.power);

      case "score":
      default:
        return sorted.sort((a, b) => b.score - a.score);
    }
  }, [stations, sortBy]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />

        <Text style={styles.loadingText}>Finding charging stations...</Text>
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>Results Near You</Text>

      {/* Search information */}
      <View style={styles.searchInfo}>
        <Text style={styles.searchInfoText}>
          📍 {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
        </Text>

        <Text style={styles.searchInfoText}>🔋 Battery: {battery}%</Text>

        <Text style={styles.searchInfoText}>🔌 Connector: {connector}</Text>
      </View>

      {/* Result count */}
      <Text style={styles.resultsTitle}>
        {stations.length} Charging Stations Found
      </Text>

      {/* Sorting */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>

        {/* Best Match */}
        <Pressable
          style={[
            styles.sortButton,
            sortBy === "score" && styles.activeSortButton,
          ]}
          onPress={() => setSortBy("score")}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortBy === "score" && styles.activeSortButtonText,
            ]}
          >
            Best Match
          </Text>
        </Pressable>

        {/* Distance */}
        <Pressable
          style={[
            styles.sortButton,
            sortBy === "distance" && styles.activeSortButton,
          ]}
          onPress={() => setSortBy("distance")}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortBy === "distance" && styles.activeSortButtonText,
            ]}
          >
            Distance
          </Text>
        </Pressable>

        {/* Wait Time */}
        <Pressable
          style={[
            styles.sortButton,
            sortBy === "wait" && styles.activeSortButton,
          ]}
          onPress={() => setSortBy("wait")}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortBy === "wait" && styles.activeSortButtonText,
            ]}
          >
            Wait Time
          </Text>
        </Pressable>

        {/* Charging Speed */}
        <Pressable
          style={[
            styles.sortButton,
            sortBy === "power" && styles.activeSortButton,
          ]}
          onPress={() => setSortBy("power")}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortBy === "power" && styles.activeSortButtonText,
            ]}
          >
            Charging Speed
          </Text>
        </Pressable>
      </View>

      {/* Station list */}
      <FlatList
        data={sortedStations}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={renderStation}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No charging stations found</Text>

            <Text style={styles.emptyText}>
              Try another connector type or search again.
            </Text>
          </View>
        }
      />
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
    padding: 24,
    backgroundColor: Colors.background,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    color: Colors.textPrimary,
  },

  searchInfo: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    gap: 8,
  },

  searchInfoText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },

  resultsTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },

  sortLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },

  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
  },

  sortButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },

  activeSortButton: {
    backgroundColor: Colors.primary,
  },

  activeSortButtonText: {
    color: Colors.background,
  },

  list: {
    paddingBottom: 24,
    gap: 12,
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

  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  emptyText: {
    marginTop: 8,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
