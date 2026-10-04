const API_URL = process.env.EXPO_PUBLIC_API_URL;

const apiRequest = async <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
};

export const getStations = async () => {
  return apiRequest("/api/stations");
};

export const searchStations = async ({
  latitude,
  longitude,
  battery,
  connector,
}: {
  latitude: number;
  longitude: number;
  battery: number;
  connector: string;
}) => {
  return apiRequest("/api/stations/search", {
    method: "POST",
    body: JSON.stringify({
      latitude,
      longitude,
      battery,
      connector,
    }),
  });
};

export const getStationById = async (id: string) => {
  return apiRequest(`/api/stations/${id}`);
};

export const allocateStation = async ({ stationId, userId, vehicleId }: { stationId: number; userId: number; vehicleId: number }) => {
  return apiRequest("/api/allocations", {
    method: "POST",
    body: JSON.stringify({
      stationId,
      userId,
      vehicleId,
    }),
  });
};

export const startCharging = async ({ allocationId, initialBattery }: { allocationId: string; initialBattery: number }) => {
  return apiRequest("/api/allocations/start", {
    method: "POST",
    body: JSON.stringify({
      allocationId,
      initialBattery,
    }),
  });
};

export const completeCharging = async ({ allocationId, finalBattery }: { allocationId: string; finalBattery: number }) => {
  return apiRequest("/api/allocations/complete", {
    method: "POST",
    body: JSON.stringify({
      allocationId,
      finalBattery,
    }),
  });
};

export const getActiveAllocation = async ({ userId, stationId }: { userId: number; stationId: number }) => {
  const data = await apiRequest<{ allocation: unknown | null }>(`/api/allocations/active?userId=${userId}&stationId=${stationId}`);

  return data.allocation;
};

export const cancelAllocation = async ({ allocationId }: { allocationId: string }) => {
  return apiRequest("/api/allocations/cancel", {
    method: "POST",
    body: JSON.stringify({
      allocationId,
    }),
  });
};

export const createVehicle = async ({
  userId,
  registrationNumber,
  brand,
  model,
  batteryCapacity,
}: {
  userId: number;
  registrationNumber: string;
  brand: string;
  model: string;
  batteryCapacity: number;
}) => {
  return apiRequest("/api/vehicles", {
    method: "POST",
    body: JSON.stringify({
      userId,
      registrationNumber,
      brand,
      model,
      batteryCapacity,
    }),
  });
};

export const getUserVehicles = async (userId: number) => {
  const data = await apiRequest<{
    vehicles: unknown[];
  }>(`/api/users/${userId}/vehicles`);

  return data.vehicles;
};
