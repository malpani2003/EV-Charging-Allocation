import { useEffect, useState } from "react";
import { searchStations } from "@/services/api";

export type Station = {
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

type UseStationsParams = {
  latitude: number;
  longitude: number;
  battery: number;
  connector: string;
};

export function useStations({
  latitude,
  longitude,
  battery,
  connector,
}: UseStationsParams) {
  const [stations, setStations] = useState<Station[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const loadStations = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await searchStations({
        latitude,
        longitude,
        battery,
        connector,
      });

      setStations(data.stations);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load stations",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  return {
    stations,
    loading,
    error,
  };
}
