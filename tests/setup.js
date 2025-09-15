/**
 * Jest setup file for charging calculator tests
 * This file runs before each test file
 */

// Mock Chart.js
global.Chart = jest.fn().mockImplementation(() => ({
  data: {
    labels: [],
    datasets: [
      { data: [], hidden: false, label: "Ladeverlauf (realistisch)" },
      { data: [], hidden: false, label: "Lineare Schätzung" },
      { data: [], hidden: true, label: "400 kW (Ultra-Schnelllader)" },
      { data: [], hidden: true, label: "300 kW (Hochleistungslader)" },
      { data: [], hidden: true, label: "150 kW (Schnelllader)" },
      { data: [], hidden: true, label: "50 kW (DC Schnelllader)" },
      { data: [], hidden: true, label: "22 kW (AC Wallbox)" },
      { data: [], hidden: true, label: "11 kW (AC Wallbox)" },
    ],
  },
  update: jest.fn(),
  destroy: jest.fn(),
}));

// Mock Google Maps API
global.google = {
  maps: {
    Map: jest.fn().mockImplementation(() => ({
      setCenter: jest.fn(),
      setZoom: jest.fn(),
      getBounds: jest.fn(() => ({
        getNorthEast: jest.fn(() => ({ lat: () => 52.6, lng: () => 13.5 })),
        getSouthWest: jest.fn(() => ({ lat: () => 52.4, lng: () => 13.3 })),
      })),
      getCenter: jest.fn(() => ({ lat: 52.5, lng: 13.4 })),
    })),
    marker: {
      AdvancedMarkerElement: jest.fn().mockImplementation(() => ({
        setMap: jest.fn(),
        addListener: jest.fn(),
      })),
    },
    InfoWindow: jest.fn().mockImplementation(() => ({
      open: jest.fn(),
      close: jest.fn(),
    })),
    event: {
      trigger: jest.fn(),
    },
    importLibrary: jest.fn().mockResolvedValue({
      Place: {
        searchNearby: jest.fn().mockResolvedValue({
          places: [],
        }),
      },
      spherical: {
        computeDistanceBetween: jest.fn(() => 10000),
      },
    }),
  },
};

// Mock fetch for JSON data loading
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock navigator.geolocation
global.navigator = {
  geolocation: {
    getCurrentPosition: jest.fn(),
  },
};

// Mock jQuery if used
global.$ = jest.fn(() => ({
  load: jest.fn(),
}));

// Mock DOM methods that might be used
Object.defineProperty(document, "getElementById", {
  value: jest.fn((id) => {
    const mockElement = {
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
      cloneNode: jest.fn(() => mockElement),
    };
    return mockElement;
  }),
  writable: true,
});

Object.defineProperty(document, "querySelectorAll", {
  value: jest.fn(() => []),
  writable: true,
});

Object.defineProperty(document, "querySelector", {
  value: jest.fn(() => null),
  writable: true,
});

Object.defineProperty(document, "createElement", {
  value: jest.fn((tagName) => ({
    tagName: tagName.toUpperCase(),
    innerHTML: "",
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(() => false),
    },
    addEventListener: jest.fn(),
    appendChild: jest.fn(),
  })),
  writable: true,
});

// Mock window object
Object.defineProperty(global.window, "location", {
  value: {
    reload: jest.fn(),
  },
  writable: true,
});

global.window.addEventListener = jest.fn();
global.window.removeEventListener = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// Mock TariffClasses
global.TariffClasses = {
  TariffManager: jest.fn().mockImplementation(() => ({
    loadFromJson: jest.fn(),
    getFilteredTariffs: jest.fn(() => []),
    sortByCost: jest.fn(() => []),
    getUniqueProviders: jest.fn(() => []),
    getUniqueConnectors: jest.fn(() => []),
    tariffs: [],
    providers: [],
  })),
  BaseTariff: jest.fn(),
  ACTariff: jest.fn(),
  DCTariff: jest.fn(),
  Provider: jest.fn(),
  ConnectorType: {
    TYPE_1: "TYPE_1",
    TYPE_2: "TYPE_2",
    CCS_1: "CCS_1",
    CCS_2: "CCS_2",
    CHADEMO: "CHAdeMO",
    TESLA: "TESLA",
    SCHUKO: "SCHUKO",
  },
  ChargingType: {
    AC: "AC",
    DC: "DC",
  },
};

// Mock window.prompt
global.window.prompt = jest.fn();
