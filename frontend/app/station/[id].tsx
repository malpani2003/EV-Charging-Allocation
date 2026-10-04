import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { allocateStation, getStationById, cancelAllocation, startCharging, completeCharging, getActiveAllocation } from "@/services/api";

type Station = {
  id: number;
  name: string;
  address?: string;
  power_kw: number;
  available_slots: number;
  total_slots: number;
  estimated_wait_minutes?: number;
};

type Allocation = {
  allocation_id: string;
  expires_at: string;
  status: string;
  initial_battery?: number;
  final_battery?: number;
  energy_consumed?: number;
  started_at?: string;
  completed_at?: string;
};

export default function StationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState<boolean>(false);

  const [showSuccess, setShowSuccess] = useState(false);

  const [allocation, setAllocation] = useState<Allocation | null>(null);

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [cancelling, setCancelling] = useState(false);

  const [startingCharging, setStartingCharging] = useState(false);
  const [initialBatteryInput, setInitialBatteryInput] = useState("");

  const [completingCharging, setCompletingCharging] = useState(false);
  const [finalBatteryInput, setFinalBatteryInput] = useState("");
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [completedAllocation, setCompletedAllocation] = useState<Allocation | null>(null);

  const loadStation = async () => {
    try {
      setLoading(true);
      setError("");

      const selectedStation = await getStationById(id);

      setStation(selectedStation);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load station");
    } finally {
      setLoading(false);
    }
  };

  const loadActiveAllocation = async () => {
    try {
      const activeAllocation = await getActiveAllocation({ userId: 1, stationId: Number(id) });

      if (activeAllocation) {
        setAllocation(activeAllocation as Allocation);
      }
    } catch {
      // Non-critical: if this fails, the user just sees the normal Reserve flow.
    }
  };

  useEffect(() => {
    loadStation();
    loadActiveAllocation();
  }, [id]);

  useEffect(() => {
    if (!allocation?.expires_at || allocation.status !== "ALLOCATED") {
      return;
    }

    let hasExpiredLocally = false;

    const updateCountdown = () => {
      const expiryTime = new Date(allocation.expires_at).getTime();

      const currentTime = Date.now();

      const difference = expiryTime - currentTime;

      const seconds = Math.max(0, Math.ceil(difference / 1000));

      setRemainingSeconds(seconds);

      // The countdown reaching 0 here is just a local clock check — the backend's
      // own expiry cron is the source of truth. Once it's run, this allocation is
      // actually EXPIRED and the slot already freed, so resync instead of leaving
      // stale Start/Cancel buttons on screen.
      if (seconds === 0 && !hasExpiredLocally) {
        hasExpiredLocally = true;

        clearInterval(interval);

        setAllocation(null);
        setError("Your reservation has expired. Please reserve again.");

        loadStation();
      }
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [allocation?.expires_at, allocation?.status]);

  const handleReservePress = () => {
    if (!station || !station.available_slots) {
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmReservation = async () => {
    if (!station) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await allocateStation({
        stationId: Number(station.id),
        userId: 1,
        vehicleId: 1,
      });

      console.log("Allocation successful:", result);

      setAllocation(result.allocation);

      setShowConfirmation(false);
      setShowSuccess(true);

      /*
       * Update station availability immediately
       * using the response returned by the backend.
       */
      setStation((currentStation) => {
        if (!currentStation) {
          return currentStation;
        }

        return {
          ...currentStation,
          available_slots: result.station.available_slots,
        };
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to reserve charging slot");

      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
  };

  const handleStartCharging = async () => {
    if (!allocation) {
      return;
    }

    const parsedBattery = Number(initialBatteryInput);

    if (initialBatteryInput.trim() === "" || Number.isNaN(parsedBattery) || parsedBattery < 0 || parsedBattery > 100) {
      setError("Enter a valid battery percentage between 0 and 100");
      return;
    }

    try {
      setStartingCharging(true);
      setError("");

      const result = await startCharging({
        allocationId: allocation.allocation_id,
        initialBattery: parsedBattery,
      });

      setAllocation(result.allocation);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to start charging");
    } finally {
      setStartingCharging(false);
    }
  };

  const handleCompleteCharging = async () => {
    if (!allocation) {
      return;
    }

    const parsedBattery = Number(finalBatteryInput);

    if (finalBatteryInput.trim() === "" || Number.isNaN(parsedBattery) || parsedBattery < 0 || parsedBattery > 100) {
      setError("Enter a valid battery percentage between 0 and 100");
      return;
    }

    if (allocation.initial_battery !== undefined && parsedBattery < allocation.initial_battery) {
      setError("Final battery cannot be lower than initial battery");
      return;
    }

    try {
      setCompletingCharging(true);
      setError("");

      const result = await completeCharging({
        allocationId: allocation.allocation_id,
        finalBattery: parsedBattery,
      });

      setCompletedAllocation(result.allocation);
      setAllocation(null);
      setShowSuccess(false);
      setShowSessionSummary(true);
      setFinalBatteryInput("");
      setInitialBatteryInput("");

      setStation((currentStation) => {
        if (!currentStation) {
          return currentStation;
        }

        return {
          ...currentStation,
          available_slots: currentStation.available_slots + 1,
        };
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to complete charging");
    } finally {
      setCompletingCharging(false);
    }
  };

  const handleCloseSessionSummary = () => {
    setShowSessionSummary(false);
    setCompletedAllocation(null);
  };

  const handleCancelPress = () => {
    setShowCancelConfirmation(true);
  };

  const handleConfirmCancel = async () => {
    if (!allocation) {
      return;
    }

    try {
      setCancelling(true);
      setError("");

      await cancelAllocation({ allocationId: allocation.allocation_id });

      setShowCancelConfirmation(false);
      setShowSuccess(false);
      setAllocation(null);

      setStation((currentStation) => {
        if (!currentStation) {
          return currentStation;
        }

        return {
          ...currentStation,
          available_slots: currentStation.available_slots + 1,
        };
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to cancel reservation");

      setShowCancelConfirmation(false);
    } finally {
      setCancelling(false);
    }
  };

  const formatCountdown = () => {
    const minutes = Math.floor(remainingSeconds / 60);

    const seconds = remainingSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  if (loading && !station) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: "Station Details",
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.textPrimary,
          }}
        />

        <ActivityIndicator size="large" color={Colors.primary} />

        <Text style={styles.loadingText}>Loading station...</Text>
      </View>
    );
  }

  if (error && !station) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: "Station Details",
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.textPrimary,
          }}
        />

        <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />

        <Text style={styles.errorText}>{error}</Text>

        <Pressable style={styles.retryButton} onPress={loadStation}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!station) {
    return null;
  }

  const isStationFull = station.available_slots <= 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Station Details",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Station Header */}
        <View style={styles.stationHeader}>
          <View style={styles.stationIconLarge}>
            <Ionicons name="flash" size={30} color={Colors.primary} />
          </View>

          <View style={styles.stationHeaderContent}>
            <Text style={styles.stationName}>{station.name}</Text>

            {station.address && <Text style={styles.address}>{station.address}</Text>}
          </View>
        </View>

        {/* Availability Badge */}
        <View style={[styles.availabilityBadge, isStationFull && styles.availabilityBadgeFull]}>
          <View style={[styles.availabilityDot, isStationFull && styles.availabilityDotFull]} />

          <Text style={[styles.availabilityText, isStationFull && styles.availabilityTextFull]}>
            {isStationFull ? "STATION FULL" : "AVAILABLE NOW"}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="flash-outline" size={21} color={Colors.primary} />

            <Text style={styles.statValue}>{station.power_kw} kW</Text>

            <Text style={styles.statLabel}>MAX POWER</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="car-outline" size={21} color={Colors.primary} />

            <Text style={styles.statValue}>
              {station.available_slots}/{station.total_slots}
            </Text>

            <Text style={styles.statLabel}>SLOTS</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={21} color={Colors.primary} />

            <Text style={styles.statValue}>{station.estimated_wait_minutes ?? 0} min</Text>

            <Text style={styles.statLabel}>WAIT TIME</Text>
          </View>
        </View>

        {/* Station Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Station Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="location-outline" size={18} color={Colors.primary} />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>

                <Text style={styles.infoValue}>{station.address || "Address available on map"}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="battery-charging-outline" size={18} color={Colors.primary} />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Charging</Text>

                <Text style={styles.infoValue}>Fast charging available</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Coming Soon */}
        <View style={styles.comingSoonCard}>
          <View style={styles.comingSoonIcon}>
            <Ionicons name="construct-outline" size={19} color={Colors.primary} />
          </View>

          <View style={styles.comingSoonContent}>
            <Text style={styles.comingSoonTitle}>Charging session tracking</Text>

            <Text style={styles.comingSoonText}>Start and monitor your charging session from the app.</Text>
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.inlineError}>
            <Ionicons name="alert-circle-outline" size={17} color={Colors.error} />

            <Text style={styles.inlineErrorText}>{error}</Text>
          </View>
        ) : null}

        {/* Reserve Button / Active Reservation Controls */}
        <View style={styles.bottomContainer}>
          {!allocation ? (
            <Pressable
              style={[styles.reserveButton, isStationFull && styles.reserveButtonDisabled]}
              disabled={isStationFull || loading}
              onPress={handleReservePress}
            >
              <Ionicons name="flash" size={20} color="#FFFFFF" />

              <Text style={styles.reserveButtonText}>{isStationFull ? "Station Full" : loading ? "Reserving..." : "Reserve Charging Slot"}</Text>
            </Pressable>
          ) : allocation.status === "CHARGING" ? (
            <>
              {/* Charging in progress */}
              <View style={[styles.countdownCard, { borderColor: Colors.primary }]}>
                <View style={styles.countdownHeader}>
                  <Ionicons name="battery-charging" size={18} color={Colors.primary} />

                  <Text style={styles.countdownLabel}>CHARGING IN PROGRESS</Text>
                </View>

                <Text style={styles.countdownHint}>Started at {allocation.initial_battery ?? 0}% battery.</Text>
              </View>

              {/* Complete Charging */}
              <View style={styles.modalDetails}>
                <Text style={[styles.modalDetailLabel, { marginTop: 12, marginBottom: 6 }]}>Final battery level (%)</Text>

                <TextInput
                  style={styles.batteryInput}
                  value={finalBatteryInput}
                  onChangeText={setFinalBatteryInput}
                  placeholder="e.g. 80"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>

              <Pressable style={styles.startChargingButton} onPress={handleCompleteCharging} disabled={completingCharging}>
                {completingCharging ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color={Colors.background} />

                    <Text style={styles.confirmButtonText}>COMPLETE CHARGING</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <>
              {/* Countdown */}
              <View style={styles.countdownCard}>
                <View style={styles.countdownHeader}>
                  <Ionicons name="time-outline" size={18} color={Colors.primary} />

                  <Text style={styles.countdownLabel}>SLOT RESERVED FOR</Text>
                </View>

                <Text style={styles.countdownValue}>{formatCountdown()}</Text>

                {remainingSeconds > 0 ? (
                  <Text style={styles.countdownHint}>Start charging before your reservation expires.</Text>
                ) : (
                  <Text style={styles.countdownExpired}>Your reservation has expired.</Text>
                )}
              </View>

              {/* Start Charging */}
              <View style={styles.modalDetails}>
                <Text style={[styles.modalDetailLabel, { marginTop: 12, marginBottom: 6 }]}>Current battery level (%)</Text>

                <TextInput
                  style={styles.batteryInput}
                  value={initialBatteryInput}
                  onChangeText={setInitialBatteryInput}
                  placeholder="e.g. 20"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>

              <Pressable style={styles.startChargingButton} onPress={handleStartCharging} disabled={startingCharging}>
                {startingCharging ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <>
                    <Ionicons name="flash" size={18} color={Colors.background} />

                    <Text style={styles.confirmButtonText}>START CHARGING</Text>
                  </>
                )}
              </Pressable>

              <Pressable style={[styles.cancelReservationButton, { marginTop: 10 }]} onPress={handleCancelPress}>
                <Text style={styles.cancelReservationButtonText}>CANCEL RESERVATION</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      {/* ================================================== */}
      {/* CONFIRMATION MODAL */}
      {/* ================================================== */}

      <Modal visible={showConfirmation} transparent animationType="fade" onRequestClose={() => setShowConfirmation(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Close */}
            <Pressable style={styles.modalCloseButton} onPress={() => setShowConfirmation(false)}>
              <Ionicons name="close" size={21} color={Colors.textSecondary} />
            </Pressable>

            {/* Icon */}
            <View style={styles.modalIcon}>
              <Ionicons name="flash" size={28} color={Colors.primary} />
            </View>

            <Text style={styles.modalTitle}>Confirm Reservation</Text>

            <Text style={styles.modalSubtitle}>Reserve a charging slot at this station?</Text>

            {/* Station */}
            <View style={styles.modalStationCard}>
              <View style={styles.modalStationIcon}>
                <Ionicons name="location" size={19} color={Colors.primary} />
              </View>

              <View style={styles.modalStationContent}>
                <Text style={styles.modalStationLabel}>CHARGING STATION</Text>

                <Text style={styles.modalStationName} numberOfLines={2}>
                  {station.name}
                </Text>
              </View>
            </View>

            {/* Reservation Details */}
            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Available slots</Text>

                <Text style={styles.modalDetailValue}>{station.available_slots}</Text>
              </View>

              <View style={styles.modalDetailDivider} />

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Charging power</Text>

                <Text style={styles.modalDetailValue}>{station.power_kw} kW</Text>
              </View>

              <View style={styles.modalDetailDivider} />

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Reservation window</Text>

                <Text style={styles.modalDetailValue}>3 minutes</Text>
              </View>
            </View>

            {/* Warning */}
            <View style={styles.modalNotice}>
              <Ionicons name="information-circle-outline" size={17} color={Colors.primary} />

              <Text style={styles.modalNoticeText}>The slot will be held for you until the reservation expires.</Text>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setShowConfirmation(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.confirmButton} onPress={handleConfirmReservation} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={19} color={Colors.background} />

                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================== */}
      {/* SUCCESS MODAL */}
      {/* ================================================== */}

      <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={handleCloseSuccess}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Success Icon */}
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={38} color={Colors.primary} />
            </View>

            <Text style={styles.modalTitle}>Reservation Confirmed</Text>

            <Text style={styles.modalSubtitle}>Your charging slot has been reserved successfully.</Text>

            {/* Station */}
            <View style={styles.modalStationCard}>
              <View style={styles.modalStationIcon}>
                <Ionicons name="flash" size={19} color={Colors.primary} />
              </View>

              <View style={styles.modalStationContent}>
                <Text style={styles.modalStationLabel}>CHARGING STATION</Text>

                <Text style={styles.modalStationName} numberOfLines={2}>
                  {station.name}
                </Text>
              </View>
            </View>

            {/* Countdown */}
            <View style={styles.countdownCard}>
              <View style={styles.countdownHeader}>
                <Ionicons name="time-outline" size={18} color={Colors.primary} />

                <Text style={styles.countdownLabel}>SLOT RESERVED FOR</Text>
              </View>

              <Text style={styles.countdownValue}>{formatCountdown()}</Text>

              <Text style={styles.countdownHint}>Start charging before your reservation expires.</Text>
            </View>

            <Text style={[styles.modalNoticeText, { marginTop: 14, textAlign: "center" }]}>
              You can start charging, complete it, or cancel from the station page.
            </Text>

            <View style={styles.successActions}>
              <Pressable style={styles.doneButton} onPress={handleCloseSuccess}>
                <Text style={styles.doneButtonText}>DONE</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================== */}
      {/* CANCEL CONFIRMATION MODAL */}
      {/* ================================================== */}

      <Modal visible={Boolean(showCancelConfirmation)} transparent animationType="fade" onRequestClose={() => setShowCancelConfirmation(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Close */}
            <Pressable style={styles.modalCloseButton} onPress={() => setShowCancelConfirmation(false)}>
              <Ionicons name="close" size={21} color={Colors.textSecondary} />
            </Pressable>

            {/* Icon */}
            <View style={[styles.modalIcon, { borderColor: Colors.error }]}>
              <Ionicons name="alert-circle" size={28} color={Colors.error} />
            </View>

            <Text style={styles.modalTitle}>Cancel Reservation?</Text>

            <Text style={styles.modalSubtitle}>This will release your reserved charging slot back to other drivers.</Text>

            {/* Station */}
            <View style={styles.modalStationCard}>
              <View style={styles.modalStationIcon}>
                <Ionicons name="location" size={19} color={Colors.primary} />
              </View>

              <View style={styles.modalStationContent}>
                <Text style={styles.modalStationLabel}>CHARGING STATION</Text>

                <Text style={styles.modalStationName} numberOfLines={2}>
                  {station.name}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setShowCancelConfirmation(false)} disabled={cancelling}>
                <Text style={styles.cancelButtonText}>Keep Reservation</Text>
              </Pressable>

              <Pressable style={[styles.confirmButton, { backgroundColor: Colors.error }]} onPress={handleConfirmCancel} disabled={cancelling}>
                {cancelling ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <>
                    <Ionicons name="close" size={19} color={Colors.background} />

                    <Text style={styles.confirmButtonText}>Yes, Cancel</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================== */}
      {/* SESSION SUMMARY MODAL */}
      {/* ================================================== */}

      <Modal visible={showSessionSummary} transparent animationType="fade" onRequestClose={handleCloseSessionSummary}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Success Icon */}
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-done" size={38} color={Colors.primary} />
            </View>

            <Text style={styles.modalTitle}>Charging Complete</Text>

            <Text style={styles.modalSubtitle}>Here's a summary of your charging session.</Text>

            {/* Station */}
            <View style={styles.modalStationCard}>
              <View style={styles.modalStationIcon}>
                <Ionicons name="flash" size={19} color={Colors.primary} />
              </View>

              <View style={styles.modalStationContent}>
                <Text style={styles.modalStationLabel}>CHARGING STATION</Text>

                <Text style={styles.modalStationName} numberOfLines={2}>
                  {station.name}
                </Text>
              </View>
            </View>

            {/* Session Details */}
            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Initial battery</Text>

                <Text style={styles.modalDetailValue}>{completedAllocation?.initial_battery ?? 0}%</Text>
              </View>

              <View style={styles.modalDetailDivider} />

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Final battery</Text>

                <Text style={styles.modalDetailValue}>{completedAllocation?.final_battery ?? 0}%</Text>
              </View>

              <View style={styles.modalDetailDivider} />

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Energy consumed</Text>

                <Text style={styles.modalDetailValue}>{Number(completedAllocation?.energy_consumed ?? 0).toFixed(2)} kWh</Text>
              </View>
            </View>

            <Pressable style={[styles.doneButton, { marginTop: 16 }]} onPress={handleCloseSessionSummary}>
              <Text style={styles.doneButtonText}>DONE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: Colors.background,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.textSecondary,
  },

  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
    color: Colors.error,
  },

  retryButton: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },

  retryButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.background,
  },

  stationHeader: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  stationIconLarge: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  stationHeaderContent: {
    flex: 1,
    marginLeft: 15,
  },

  stationName: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.textPrimary,
  },

  address: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },

  availabilityBadge: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
  },

  availabilityBadgeFull: {
    borderWidth: 1,
    borderColor: Colors.error,
  },

  availabilityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  availabilityDotFull: {
    backgroundColor: Colors.error,
  },

  availabilityText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: Colors.primary,
  },

  availabilityTextFull: {
    color: Colors.error,
  },

  statsContainer: {
    marginTop: 20,
    flexDirection: "row",
    gap: 10,
  },

  statCard: {
    flex: 1,
    minHeight: 100,
    padding: 13,
    borderRadius: 15,
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  statValue: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "900",
    color: Colors.textPrimary,
  },

  statLabel: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: Colors.textSecondary,
  },

  section: {
    marginTop: 24,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  infoCard: {
    marginTop: 10,
    padding: 15,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  infoRow: {
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  infoRowLast: {
    marginBottom: 0,
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },

  infoContent: {
    flex: 1,
    marginLeft: 12,
  },

  infoLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },

  infoValue: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  comingSoonCard: {
    marginTop: 4,
    padding: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  comingSoonIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },

  comingSoonContent: {
    flex: 1,
    marginLeft: 12,
  },

  comingSoonTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  comingSoonText: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: Colors.textSecondary,
  },

  successActions: {
    marginTop: 16,
    gap: 10,
  },

  cancelReservationButton: {
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.error,
  },

  cancelReservationButtonText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    color: Colors.error,
  },

  doneButton: {
    marginTop: 0,
    height: 50,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  inlineError: {
    marginTop: 10,
    padding: 10,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: Colors.surface,
  },

  inlineErrorText: {
    flex: 1,
    fontSize: 11,
    color: Colors.error,
  },

  bottomContainer: {
    marginTop: "auto",
    paddingTop: 16,
    paddingBottom: 8,
  },

  reserveButton: {
    height: 54,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.primary,
  },

  reserveButtonDisabled: {
    opacity: 0.45,
  },

  reserveButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  /* ============================= */
  /* MODAL */
  /* ============================= */

  modalOverlay: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },

  modalContainer: {
    width: "100%",
    maxWidth: 430,
    padding: 22,
    borderRadius: 24,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  modalCloseButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 2,
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },

  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },

  successIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
  },

  modalTitle: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: "900",
    color: Colors.textPrimary,
  },

  modalSubtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },

  modalStationCard: {
    marginTop: 18,
    padding: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  modalStationIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },

  modalStationContent: {
    flex: 1,
    marginLeft: 11,
  },

  modalStationLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.9,
    color: Colors.textSecondary,
  },

  modalStationName: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  modalDetails: {
    marginTop: 12,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  modalDetailRow: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalDetailLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },

  modalDetailValue: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  modalDetailDivider: {
    height: 1,
    backgroundColor: Colors.surfaceElevated,
  },

  modalNotice: {
    marginTop: 12,
    padding: 11,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
  },

  modalNoticeText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: Colors.textSecondary,
  },

  modalActions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  cancelButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
  },

  confirmButton: {
    flex: 1.2,
    height: 50,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: Colors.primary,
  },

  confirmButtonText: { fontSize: 12, fontWeight: "900", color: Colors.background },
  batteryInput: {
    marginBottom: 12,
    height: 44,
    paddingHorizontal: 13,
    borderRadius: 11,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },
  startChargingButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: Colors.primary,
  },
  /* ============================= */ /* SUCCESS */ /* ============================= */ countdownCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  countdownHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  countdownLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 0.9, color: Colors.textSecondary },
  countdownValue: { marginTop: 5, fontSize: 38, fontWeight: "900", letterSpacing: 1, color: Colors.primary },
  countdownHint: { marginTop: 3, fontSize: 10, textAlign: "center", color: Colors.textSecondary },
  countdownExpired: { marginTop: 3, fontSize: 10, color: Colors.error },
  doneButtonText: { fontSize: 12, fontWeight: "900", color: Colors.background },
});
