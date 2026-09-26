const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const getStations = async () => {
  const response = await fetch(`${API_URL}/api/stations`);

  if (!response.ok) {
    throw new Error("Failed to fetch stations");
  }

  return response.json();
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
  const response = await fetch(`${API_URL}/api/stations/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      latitude,
      longitude,
      battery,
      connector,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Search API failed: ${response.status} ${responseText}`);
  }

  return JSON.parse(responseText);
};

export const getStationById = async (id: string) => {
  const response = await fetch(`${API_URL}/api/stations/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch station");
  }

  return response.json();
};

export const allocateStation = async (id: string) => {
  const response = await fetch(`${API_URL}/api/stations/${id}/allocate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to allocate charging slot");
  }

  return data;
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
  const response = await fetch(`${API_URL}/api/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      registrationNumber,
      brand,
      model,
      batteryCapacity,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to add vehicle");
  }

  return data;
};

export const getUserVehicles = async (userId: number) => {
  const response = await fetch(`${API_URL}/api/users/${userId}/vehicles`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch vehicles");
  }

  return data.vehicles;
};
