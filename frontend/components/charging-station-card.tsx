import { StyleSheet, Text, Pressable, View } from "react-native";
import { Colors } from "@/constants/colors";
import React from "react";

type ChargingStation = {
  id: string;
  name: string;
  distance: number;
  power: number;
  waitTime: number;
  trustScore: number;
  score: number;
};

type ChargingStationCardProps = {
  station: ChargingStation;
  rank: number;
  onPress?: () => void;
};

function ChargingStationCard({
  station,
  rank,
  onPress,
}: ChargingStationCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.name}>{station.name}</Text>

        <View style={styles.rankBadge}>
          <Text style={styles.rank}>#{rank}</Text>
        </View>
      </View>

      <Text style={styles.info}>
        📍 {station.distance} km · {station.waitTime} min wait
      </Text>

      <Text style={styles.info}>⚡ {station.power} kW Fast Charging</Text>

      <View style={styles.bottomRow}>
        <Text style={styles.trust}>
          Trust {"●".repeat(station.trustScore)}
          {"○".repeat(5 - station.trustScore)}
        </Text>

        <Text style={styles.score}>{station.score}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  rankBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  rank: {
    color: Colors.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },

  info: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },

  bottomRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceElevated,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  trust: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  score: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.primary,
  },
});

export default React.memo(ChargingStationCard);
