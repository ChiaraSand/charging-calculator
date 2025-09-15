/**
 * Tests for GoogleMapsManager class
 */

const {
  mockDefaultLocation,
  mockChargingStations,
  mockConnectorData,
} = require("../mocks/testData.js");

describe("GoogleMapsManager", () => {
  let GoogleMapsManager;

  beforeAll(() => {
    // Import the actual GoogleMapsManager class
    GoogleMapsManager = require("../../pages/calculator/services/GoogleMapsManager.js");
  });

  let mapsManager;

  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();

    // Reset DOM mocks
    document.getElementById.mockClear();
    document.createElement.mockClear();

    // Reset navigator mock
    if (global.navigator && global.navigator.geolocation) {
      global.navigator.geolocation.getCurrentPosition.mockClear();
    }

    mapsManager = new GoogleMapsManager(true);
  });

  describe("constructor", () => {
    test("should initialize with correct default values", () => {
      expect(mapsManager.map).toBeNull();
      expect(mapsManager.userLocation).toBeNull();
      expect(mapsManager.chargingStationMarkers).toEqual([]);
      expect(mapsManager.enable).toBe(true);
      expect(mapsManager.enableInit).toBe(true);
    });

    test("should initialize with disabled map when enableInit is false", () => {
      const disabledMapsManager = new GoogleMapsManager(false);
      expect(disabledMapsManager.enableInit).toBe(false);
    });
  });

  describe("loadDataFromJson", () => {
    test("should load default location and connector data", async () => {
      await mapsManager.loadDataFromJson();

      expect(mapsManager.defaultLocation).toEqual(mockDefaultLocation);
      expect(mapsManager.connectorData).toEqual(mockConnectorData);
    });
  });

  describe("getApiKey", () => {
    test("should return API key from localStorage", () => {
      localStorage.setItem(
        "charging-calculator",
        JSON.stringify({
          googleMapsApiKey: "test-api-key",
        })
      );

      const apiKey = mapsManager.getApiKey();
      expect(apiKey).toBe("test-api-key");
    });

    test("should return API key from window object", () => {
      window.GOOGLE_MAPS_API_KEY = "window-api-key";

      const apiKey = mapsManager.getApiKey();
      expect(apiKey).toBe("window-api-key");

      // Clean up
      delete window.GOOGLE_MAPS_API_KEY;
    });

    // test("should return API key from secrets.json", () => {

    // });

    // test("should return placeholder when no API key found", () => {
    //   const apiKey = mapsManager.getApiKey();
    //   expect(apiKey).toBe("YOUR_API_KEY_HERE");
    // });
  });

  describe("map enabled state management", () => {
    test("should sync map enabled state from localStorage", () => {
      localStorage.setItem(
        "charging-calculator",
        JSON.stringify({
          enableMap: false,
        })
      );

      mapsManager.syncMapEnabled();
      expect(mapsManager.enable).toBe(false);
    });

    test("should use default state when no localStorage value", () => {
      mapsManager.syncMapEnabled();
      expect(mapsManager.enable).toBe(true);
    });

    test("should toggle map enabled state", () => {
      const originalReload = window.location.reload;
      window.location.reload = jest.fn();

      mapsManager.toggleMapEnabled();

      expect(mapsManager.enable).toBe(false);
      expect(window.location.reload).toHaveBeenCalled();

      window.location.reload = originalReload;
    });
  });

  describe("getCurrentLocation", () => {
    // test("should get current location successfully", async () => {
    //   const mockPosition = {
    //     coords: {
    //       latitude: 52.5,
    //       longitude: 13.4,
    //     },
    //   };

    // navigator.geolocation.getCurrentPosition.mockImplementation(
    //   (success, error) => {
    //     success(mockPosition);
    //   }
    // );

    //   const result = await mapsManager.getCurrentLocation();

    //   expect(result).toEqual(mockPosition.coords);
    //   expect(mapsManager.userLocation).toEqual(mockPosition.coords);
    // });

    // test("should handle geolocation error", async () => {
    //   const mockError = new Error("Geolocation denied");
    //   navigator.geolocation.getCurrentPosition.mockImplementation(
    //     (success, error) => {
    //       error(mockError);
    //     }
    //   );

    //   await expect(mapsManager.getCurrentLocation()).rejects.toThrow(
    //     "Geolocation denied"
    //   );
    // });

    test("should handle unsupported geolocation", async () => {
      const originalGeolocation = navigator.geolocation;
      delete navigator.geolocation;

      await expect(mapsManager.getCurrentLocation()).rejects.toThrow(
        "Geolocation not supported"
      );

      navigator.geolocation = originalGeolocation;
    });
  });

  describe("findRealChargingStations", () => {
    beforeEach(() => {
      mapsManager.map = {
        getBounds: jest.fn(() => ({
          getNorthEast: jest.fn(() => ({ lat: () => 52.6, lng: () => 13.5 })),
          getSouthWest: jest.fn(() => ({ lat: () => 52.4, lng: () => 13.3 })),
        })),
      };
    });

    test("should find and add charging stations to map", async () => {
      const mockPlaces = {
        places: mockChargingStations,
      };

      google.maps.importLibrary.mockResolvedValue({
        Place: {
          searchNearby: jest.fn().mockResolvedValue(mockPlaces),
        },
        spherical: {
          computeDistanceBetween: jest.fn(() => 10000),
        },
      });

      const mockCanvas = createMockElement("map");
      document.getElementById.mockReturnValue(mockCanvas);
      mapsManager.map = {
        ...mapsManager.map,
        getCenter: jest.fn(() => ({ lat: 52.5, lng: 13.4 })),
      };

      await mapsManager.findRealChargingStations({ lat: 52.5, lng: 13.4 });

      expect(google.maps.importLibrary).toHaveBeenCalledWith("places");
      expect(google.maps.importLibrary).toHaveBeenCalledWith("geometry");
    });

    test("should handle no stations found", async () => {
      google.maps.importLibrary.mockResolvedValue({
        Place: {
          searchNearby: jest.fn().mockResolvedValue({ places: [] }),
        },
        spherical: {
          computeDistanceBetween: jest.fn(() => 10000),
        },
      });

      await mapsManager.findRealChargingStations({ lat: 52.5, lng: 13.4 });

      expect(google.maps.importLibrary).toHaveBeenCalled();
    });
  });

  describe("extractConnectorTypes", () => {
    test("should extract connector types from aggregations", () => {
      const aggregations = [{ type: "CCS_COMBO_2" }, { type: "TYPE_2" }];

      const connectorTypes = mapsManager.extractConnectorTypes(aggregations);

      expect(connectorTypes.length).toBeGreaterThan(0);
    });

    test("should handle empty aggregations", () => {
      const connectorTypes = mapsManager.extractConnectorTypes([]);
      expect(connectorTypes).toEqual([]);
    });

    test("should handle null aggregations", () => {
      const connectorTypes = mapsManager.extractConnectorTypes(null);
      expect(connectorTypes).toEqual([]);
    });
  });

  describe("mapConnectorType", () => {
    test("should map Google connector types to internal types", () => {
      const mappedType = mapsManager.mapConnectorType("CCS_COMBO_2");
      expect(mappedType).toBeDefined();
    });

    test("should return original type if no mapping found", () => {
      const mappedType = mapsManager.mapConnectorType("UNKNOWN_TYPE");
      expect(mappedType).toBe("UNKNOWN_TYPE");
    });
  });

  describe("getFullAddress", () => {
    test("should return formatted address when available", () => {
      const station = { formatted_address: "123 Test Street, Berlin" };
      const address = mapsManager.getFullAddress(station);
      expect(address).toBe("123 Test Street, Berlin");
    });

    test("should construct address from components", () => {
      const station = {
        addressComponents: [
          { Gg: "123" },
          { Gg: "Test Street" },
          { Gg: "Berlin" },
          { Gg: "10115" },
        ],
      };
      const address = mapsManager.getFullAddress(station);
      expect(address).toContain("Test Street");
    });

    test("should return N/A when no address data", () => {
      const station = {};
      const address = mapsManager.getFullAddress(station);
      expect(address).toBe("N/A");
    });
  });

  describe("getRelativeTime", () => {
    test("should return relative time for recent timestamp", () => {
      const now = new Date();
      const recentTime = new Date(now.getTime() - 30000); // 30 seconds ago

      const relativeTime = mapsManager.getRelativeTime(recentTime);
      expect(relativeTime).toContain("vor wenigen Sekunden");
    });

    test("should return relative time for minutes ago", () => {
      const now = new Date();
      const minutesAgo = new Date(now.getTime() - 5 * 60000); // 5 minutes ago

      const relativeTime = mapsManager.getRelativeTime(minutesAgo);
      expect(relativeTime).toContain("vor 5 Min.");
    });

    test("should return relative time for hours ago", () => {
      const now = new Date();
      const hoursAgo = new Date(now.getTime() - 2 * 3600000); // 2 hours ago

      const relativeTime = mapsManager.getRelativeTime(hoursAgo);
      expect(relativeTime).toContain("vor 2h");
    });

    test("should return unknown for invalid timestamp", () => {
      const relativeTime = mapsManager.getRelativeTime(null);
      expect(relativeTime).toBe("unbekannt");
    });
  });

  describe("UI helper methods", () => {
    test("should show and hide elements", () => {
      const mockElement = createMockElement("testElement");
      document.getElementById.mockReturnValue(mockElement);

      mapsManager.showElement("testElement", "block");
      expect(mockElement.style.display).toBe("block");

      mapsManager.hideElement("testElement");
      expect(mockElement.style.display).toBe("none");
    });

    test("should handle missing elements gracefully", () => {
      document.getElementById.mockReturnValue(null);

      expect(() => {
        mapsManager.showElement("nonexistent");
        mapsManager.hideElement("nonexistent");
      }).not.toThrow();
    });
  });

  describe("refreshChargingStations", () => {
    test("should clear existing markers and refresh", () => {
      const mockMarker = { map: "test" };
      mapsManager.chargingStationMarkers = [mockMarker];
      mapsManager.map = {
        getCenter: jest.fn(() => ({ lat: 52.5, lng: 13.4 })),
      };

      const mockButton = createMockElement("refreshStations");
      document.getElementById.mockReturnValue(mockButton);

      mapsManager.refreshChargingStations();

      expect(mapsManager.chargingStationMarkers).toEqual([]);
      expect(mockButton.innerHTML).toContain("Aktualisiere...");
    });
  });
});

// Helper function to create mock DOM elements
function createMockElement(id, properties = {}) {
  return {
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
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    querySelector: jest.fn(() => null),
    closest: jest.fn(() => null),
    cloneNode: jest.fn(() => createMockElement(id, properties)),
    replaceChild: jest.fn(),
    appendChild: jest.fn(),
    ...properties,
  };
}
