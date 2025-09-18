/**
 * Test data and mock fixtures for charging calculator tests
 */

// Mock vehicle charging curve data
export const mockVehicleData = {
  "renault-5-e-tech-52kwh": {
    name: "Renault 5 E-Tech 52 kWh",
    batteryCapacity: 52,
    maxChargingPower: 100,
    connectorType: "CCS",
    chargingCurves: {
      400: {
        14: 100.39,
        15: 100.56,
        20: 100.89,
        30: 96.05,
        40: 88.88,
        50: 75.86,
        60: 65.65,
        70: 59.69,
        80: 41.85,
        90: 32.03,
        95: 18.64,
      },
      150: {
        14: 75.0,
        20: 75.0,
        30: 72.0,
        40: 66.0,
        50: 57.0,
        60: 49.0,
        70: 45.0,
        80: 31.0,
        90: 24.0,
        95: 14.0,
      },
      22: {
        14: 22.0,
        20: 22.0,
        30: 22.0,
        40: 22.0,
        50: 22.0,
        60: 22.0,
        70: 22.0,
        80: 22.0,
        90: 22.0,
        95: 22.0,
      },
    },
  },
  generic: {
    name: "Generic Vehicle",
    batteryCapacity: 50,
    maxChargingPower: 150,
    connectorType: "CCS",
    chargingCurves: {},
  },
};

// Mock tariff data
export const mockTariffData = [
  {
    id: "aral-pulse-adac",
    name: "Aral Pulse (ADAC)",
    type: "AC",
    pricePerKwh: 0.57,
    baseFee: 0,
    blockingFee: false,
    connectors: ["TYPE_2"],
    description: "Aral Pulse ADAC Tarif",
  },
  {
    id: "qwello-nrw",
    name: "Qwello NRW",
    type: "AC",
    pricePerKwh: 0.49,
    baseFee: 0,
    blockingFee: {
      description: "Max 3,60 € Blocking Fee von 21-7h",
      pricePerMin: 0.02,
      conditions: {
        daytime: {
          description: "night cap",
          timeRanges: [
            {
              from: "21:00",
              to: "07:00",
              pricePerMin: 0.02,
              maxPrice: 3.6,
              maxBilledMinutes: 180,
            },
            {
              from: "07:00",
              to: "21:00",
              pricePerMin: 0.02,
            },
          ],
        },
        whileCharging: true,
        whileIdle: true,
      },
    },
    connectors: ["TYPE_2"],
    description: "Qwello NRW Tarif",
  },
  {
    id: "mobility-plus-fremd",
    name: "Mobility+ Fremd",
    type: "DC",
    pricePerKwh: 0.84,
    baseFee: 0,
    blockingFee: {
      pricePerMin: 0.1,
      maxPerSession: 12.0,
    },
    connectors: ["CCS_2", "CHAdeMO"],
    description: "Mobility+ Fremd Tarif",
  },
  {
    id: "ionity",
    name: "Ionity",
    type: "DC",
    pricePerKwh: 0.79,
    baseFee: 0,
    blockingFee: false,
    connectors: ["CCS_2"],
    description: "Ionity DC Schnelllader",
  },
  {
    id: "eon-light-dc",
    name: "E.ON Light DC",
    type: "DC",
    pricePerKwh: 0.61,
    baseFee: 0,
    blockingFee: {
      description:
        "Depends on Provider (and Station?). \nE.ON Drive: ⏳>45min: 0.10€/min\nIonity: 0.00€/min\nE.ON Drive Infrastructure: ⏳>1h: {🕙9-22h: 0.15€/min, 🕙22-9h: 0.00€/min.}",
      conditions: {
        providerSpecific: {
          ionity: false,
          "eon-drive": {
            pricePerMin: 0.1,
            conditions: {
              durationMinutes: {
                description: ">45min",
                from: 45,
              },
            },
          },
          "eon-drive-infrastructure": {
            pricePerMin: 0.15,
            conditions: {
              durationHours: {
                description: ">1h",
                from: 1,
              },
              daytime: {
                description: "9-22h: 0.15€/min, 22-9h: 0.00€/min",
                timeRanges: [
                  {
                    from: "09:00",
                    to: "22:00",
                    pricePerMin: 0.15,
                  },
                  {
                    from: "22:00",
                    to: "09:00",
                    pricePerMin: 0.0,
                  },
                ],
              },
            },
          },
        },
      },
    },
    connectors: ["CCS_2"],
    description: "E.ON & Partner",
  },
];

// Mock connector data
export const mockConnectorData = {
  connectors: [
    {
      id: "TYPE_1",
      name: "Type 1 (J1772)",
      description: "AC-Ladung, hauptsächlich in Nordamerika",
      chargingType: "AC",
      aliases: ["J1772", "IEC_62196_T1"],
    },
    {
      id: "TYPE_2",
      name: "Type 2 (Mennekes)",
      description: "AC-Ladung, Standard in Europa",
      chargingType: "AC",
      aliases: ["MENNEKES", "IEC_62196_T2"],
    },
    {
      id: "CCS_1",
      name: "CCS 1",
      description: "DC-Schnellladung, Nordamerika",
      chargingType: "DC",
      aliases: ["IEC_62196_T1_COMBO"],
    },
    {
      id: "CCS_2",
      name: "CCS 2",
      description: "DC-Schnellladung, Europa",
      chargingType: "DC",
      aliases: ["IEC_62196_T2_COMBO"],
    },
    {
      id: "CHAdeMO",
      name: "CHAdeMO",
      description: "DC-Schnellladung, hauptsächlich Japan",
      chargingType: "DC",
      aliases: [],
    },
    {
      id: "TESLA",
      name: "Tesla Supercharger",
      description: "Tesla-eigene DC-Schnellladung",
      chargingType: "DC",
      aliases: [],
    },
    {
      id: "SCHUKO",
      name: "Schuko",
      description: "Haushaltssteckdose, AC-Ladung",
      chargingType: "AC",
      aliases: [],
    },
  ],
  chargingTypeMapping: {
    AC: ["TYPE_1", "TYPE_2", "SCHUKO"],
    DC: ["CCS_1", "CCS_2", "CHAdeMO", "TESLA"],
  },
  enumValues: {
    TYPE_1: "TYPE_1",
    TYPE_2: "TYPE_2",
    CCS_1: "CCS_1",
    CCS_2: "CCS_2",
    CHADEMO: "CHAdeMO",
    TESLA: "TESLA",
    SCHUKO: "SCHUKO",
  },
};

// Mock charging powers data
export const mockChargingPowers = [400, 300, 150, 50, 22, 11];

// Mock presets data
export const mockPresets = {
  "renault-5-daily": {
    vehicle: "renault-5-e-tech-52kwh",
    batteryCapacity: 52,
    currentCharge: 20,
    targetCharge: 80,
    chargingPower: 22,
    tariffFilter: "cheapest",
  },
  "renault-5-trip": {
    vehicle: "renault-5-e-tech-52kwh",
    batteryCapacity: 52,
    currentCharge: 10,
    targetCharge: 90,
    chargingPower: 150,
    tariffFilter: "premium",
  },
};

// Mock provider groups data
export const mockProviderGroups = {
  premiumProviders: ["Ionity", "Tesla"],
  localProviders: ["EWE Go", "Qwello NRW"],
};

// Mock input fields data
export const mockInputFields = [
  "batteryCapacity",
  "currentCharge",
  "targetCharge",
  "startTime",
  "endTime",
];

// Mock default location data
export const mockDefaultLocation = {
  lat: 52.52,
  lng: 13.405,
};

// Mock charging station data for maps
export const mockChargingStations = [
  {
    displayName: "Test Charging Station 1",
    location: { lat: 52.53, lng: 13.41 },
    evChargeOptions: {
      connectorCount: 4,
      connectorAggregations: [
        {
          type: "CCS_COMBO_2",
          maxChargeRateKw: 150,
          count: 2,
          availableCount: 1,
          outOfServiceCount: 0,
          availabilityLastUpdateTime: "2025-01-07T12:00:00.000Z",
        },
        {
          type: "TYPE_2",
          maxChargeRateKw: 22,
          count: 2,
          availableCount: 2,
          outOfServiceCount: 0,
          availabilityLastUpdateTime: "2025-01-07T12:00:00.000Z",
        },
      ],
    },
    addressComponents: [
      { Gg: "123" },
      { Gg: "Test Street" },
      { Gg: "Berlin" },
      { Gg: "10115" },
    ],
  },
];

// Helper function to create mock DOM elements
export const createMockElement = (id, properties = {}) => ({
  id,
  value: "",
  textContent: "",
  innerHTML: "",
  style: {},
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(() => false),
  },
  addEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  appendChild: jest.fn(),
  replaceChild: jest.fn(),
  cloneNode: jest.fn(() => createMockElement(id, properties)),
  ...properties,
});

// Helper function to setup fetch mocks
export const setupFetchMocks = () => {
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPresets),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockConnectorData),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProviderGroups),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockChargingPowers),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockInputFields),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockVehicleData),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTariffData),
    });
};
