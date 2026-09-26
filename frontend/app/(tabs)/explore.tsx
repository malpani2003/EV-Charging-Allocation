import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import * as Location from 'expo-location';

import { Colors } from '@/constants/colors';

export default function ExploreScreen() {
  const [battery, setBattery] = useState(18);
  const [connector, setConnector] = useState('CCS2');

  const [validationError, setValidationError] = useState('');

  const [location, setLocation] =
    useState<Location.LocationObject | null>(null);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationError, setLocationError] =
    useState('');

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      setLocationError('');

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocationError(
          'Location permission is required to find nearby charging stations.'
        );
        return;
      }

      const currentLocation =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      setLocation(currentLocation);
    } catch {
      setLocationError(
        'Unable to get your current location.'
      );
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const handleSearch = () => {
    setValidationError('');

    if (battery < 0 || battery > 100) {
      setValidationError(
        'Battery level must be between 0 and 100'
      );
      return;
    }

    if (!location) {
      setValidationError(
        'Please allow location access before searching.'
      );
      return;
    }

    const latitude = location.coords.latitude;
    const longitude = location.coords.longitude;

    router.push({
      pathname: '/results',
      params: {
        latitude: String(latitude),
        longitude: String(longitude),
        battery: String(battery),
        connector,
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Find Charging Stations
      </Text>

      {/* Location */}
      <Text style={styles.label}>
        📍 Current Location
      </Text>

      <View style={styles.locationContainer}>
        {locationLoading ? (
          <View style={styles.locationRow}>
            <ActivityIndicator color={Colors.primary} />

            <Text style={styles.locationText}>
              Getting your location...
            </Text>
          </View>
        ) : location ? (
          <View>
            <Text style={styles.locationSuccess}>
              📍 Location detected
            </Text>

            <Text style={styles.coordinates}>
              {location.coords.latitude.toFixed(6)},{' '}
              {location.coords.longitude.toFixed(6)}
            </Text>
          </View>
        ) : (
          <Text style={styles.locationErrorText}>
            {locationError || 'Location unavailable'}
          </Text>
        )}

        {!locationLoading && (
          <Pressable
            style={styles.refreshButton}
            onPress={getCurrentLocation}
          >
            <Text style={styles.refreshButtonText}>
              ↻
            </Text>
          </Pressable>
        )}
      </View>

      {/* Battery */}
      <View style={styles.batteryHeader}>
        <Text style={styles.label}>
          🔋 Battery Level
        </Text>

        <Text style={styles.batteryValue}>
          {battery}%
        </Text>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={100}
        step={1}
        value={battery}
        onValueChange={setBattery}
        minimumTrackTintColor={Colors.primary}
        maximumTrackTintColor={Colors.surfaceElevated}
        thumbTintColor={Colors.primary}
      />

      {/* Connector */}
      <Text style={styles.label}>
        🔌 Connector Type
      </Text>

      <View style={styles.connectorContainer}>
        {(['CCS2', 'Type2', 'Bharat DC'] as const).map((type) => (
          <Pressable
            key={type}
            style={[
              styles.connectorButton,
              connector === type && styles.selectedConnector,
            ]}
            onPress={() => setConnector(type)}
          >
            <Text
              style={[
                styles.connectorText,
                connector === type && styles.selectedText,
              ]}
            >
              {type}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Validation Error */}
      {validationError && (
        <Text style={styles.errorText}>
          {validationError}
        </Text>
      )}

      {/* Location Error */}
      {locationError && !validationError && (
        <Text style={styles.errorText}>
          {locationError}
        </Text>
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
          FIND STATIONS →
        </Text>
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

  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 32,
    color: Colors.textPrimary,
  },

  label: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
    color: Colors.textSecondary,
  },

  locationContainer: {
    minHeight: 60,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  locationText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },

  locationSuccess: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  coordinates: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },

  locationErrorText: {
    color: Colors.error,
    fontSize: 14,
    flex: 1,
  },

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  batteryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  batteryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },

  slider: {
    width: '100%',
    height: 40,
  },

  connectorContainer: {
    flexDirection: 'row',
    gap: 8,
  },

  connectorButton: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },

  selectedConnector: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  connectorText: {
    fontWeight: '700',
    color: Colors.textSecondary,
  },

  selectedText: {
    color: Colors.background,
  },

  errorText: {
    marginTop: 16,
    color: Colors.error,
    fontSize: 14,
  },

  searchButton: {
    marginTop: 32,
    padding: 17,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.5,
  },

  searchButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '800',
  },
});
