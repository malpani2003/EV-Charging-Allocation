import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, router } from "expo-router";

import { createVehicle } from "@/services/api";
import { Colors } from "@/constants/colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function AddVehicleScreen() {
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [batteryCapacity, setBatteryCapacity] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddVehicle = async () => {
    setError("");

    if (!registrationNumber || !brand || !model || !batteryCapacity) {
      setError("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      await createVehicle({
        userId: 1,
        registrationNumber: registrationNumber.trim(),
        brand: brand.trim(),
        model: model.trim(),
        batteryCapacity: Number(batteryCapacity),
      });

      router.back();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to add vehicle",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: "Add Vehicle",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconCircle}>
          <IconSymbol name="car.fill" size={30} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Add Your Vehicle</Text>

        <Text style={styles.subtitle}>
          Add your EV details to use charging allocation.
        </Text>

        <Text style={styles.label}>Registration Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. MH12 AB 1234"
          placeholderTextColor={Colors.textMuted}
          value={registrationNumber}
          onChangeText={setRegistrationNumber}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Brand</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Tata"
          placeholderTextColor={Colors.textMuted}
          value={brand}
          onChangeText={setBrand}
        />

        <Text style={styles.label}>Model</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Nexon EV"
          placeholderTextColor={Colors.textMuted}
          value={model}
          onChangeText={setModel}
        />

        <Text style={styles.label}>Battery Capacity (kWh)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 40"
          placeholderTextColor={Colors.textMuted}
          value={batteryCapacity}
          onChangeText={setBatteryCapacity}
          keyboardType="numeric"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleAddVehicle}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text style={styles.buttonText}>ADD VEHICLE</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: 24,
    paddingBottom: 48,
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    marginBottom: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    fontSize: 14,
    color: Colors.textSecondary,
  },

  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
  },

  input: {
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  errorText: {
    marginBottom: 14,
    color: Colors.error,
    fontSize: 14,
  },

  button: {
    marginTop: 10,
    padding: 17,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: Colors.primary,
  },

  buttonPressed: {
    opacity: 0.85,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: "800",
  },
});
