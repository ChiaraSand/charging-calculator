/**
 * Tests for ChartManager class
 */

import ChartManager from "services/ChartManager.js";
import { mockChargingPowers } from "mocks/testData.js";

describe("ChartManager", () => {
  let chartManager;
  let mockVehicleCurves;

  beforeEach(() => {
    // Mock vehicle curves
    mockVehicleCurves = {
      calculateChargingTime: jest.fn().mockReturnValue({
        totalTime: 60,
        totalEnergy: 30,
        timeSteps: [0, 30, 60],
        powerSteps: [150, 140, 120, 100, 80],
        finalBatteryLevel: 80,
        averagePower: 125,
      }),
      vehicleData: {
        "renault-5-e-tech-52kwh": {
          name: "Renault 5 E-Tech 52kWh",
          batteryCapacity: 52,
        },
      },
    };

    chartManager = new ChartManager(mockVehicleCurves, mockChargingPowers);
  });

  describe("constructor", () => {
    test("should initialize with vehicle curves and charging powers", () => {
      expect(chartManager.vehicleCurves).toBe(mockVehicleCurves);
      expect(chartManager.chargingPowers).toEqual(mockChargingPowers);
      expect(chartManager.chargingChart).toBeNull();
    });

    test("should use default charging powers if none provided", () => {
      const defaultChartManager = new ChartManager(mockVehicleCurves);
      expect(defaultChartManager.chargingPowers).toEqual([
        400, 300, 150, 50, 22, 11,
      ]);
    });
  });

  describe("initializeChargingChart", () => {
    test("should initialize chart when canvas element exists", () => {
      const mockCanvas = createMockElement("chargingLevelChart");
      document.getElementById.mockReturnValue(mockCanvas);

      chartManager.initializeChargingChart();

      expect(Chart).toHaveBeenCalled();
      expect(chartManager.chargingChart).toBeDefined();
    });

    test("should not initialize chart when canvas element does not exist", () => {
      // Clear any previous calls
      Chart.mockClear();
      document.getElementById.mockReturnValue(null);

      chartManager.initializeChargingChart();

      expect(Chart).not.toHaveBeenCalled();
      expect(chartManager.chargingChart).toBeNull();
    });

    test("should hide all datasets after initialization", () => {
      const mockCanvas = createMockElement("chargingLevelChart");
      document.getElementById.mockReturnValue(mockCanvas);

      chartManager.initializeChargingChart();

      // The first two datasets (realistic and linear) should be visible, others hidden
      expect(chartManager.chargingChart.data.datasets[0].hidden).toBe(false); // Realistic
      expect(chartManager.chargingChart.data.datasets[1].hidden).toBe(false); // Linear
      expect(chartManager.chargingChart.data.datasets[2].hidden).toBe(true); // 400kW
      expect(chartManager.chargingChart.data.datasets[3].hidden).toBe(true); // 300kW
    });
  });

  describe("updateChargingChart", () => {
    beforeEach(() => {
      const mockCanvas = createMockElement("chargingLevelChart");
      document.getElementById.mockReturnValue(mockCanvas);
      chartManager.initializeChargingChart();
    });

    test("should update chart with valid parameters", () => {
      const params = {
        batteryCapacity: 52,
        currentCharge: 20,
        targetCharge: 80,
        chargingPower: 150,
        selectedVehicle: "renault-5-e-tech-52kwh",
      };

      chartManager.updateChargingChart(params);

      expect(mockVehicleCurves.calculateChargingTime).toHaveBeenCalledWith(
        "renault-5-e-tech-52kwh",
        20,
        80,
        150,
        52
      );
      expect(chartManager.chargingChart.update).toHaveBeenCalled();
    });

    test("should clear chart data for invalid parameters", () => {
      const params = {
        batteryCapacity: 0,
        currentCharge: 20,
        targetCharge: 80,
        chargingPower: 150,
      };

      chartManager.updateChargingChart(params);

      expect(chartManager.chargingChart.data.labels).toEqual([]);
      expect(chartManager.chargingChart.data.datasets[0].data).toEqual([]);
    });

    test("should handle case when target charge is not greater than current charge", () => {
      const params = {
        batteryCapacity: 52,
        currentCharge: 80,
        targetCharge: 20,
        chargingPower: 150,
      };

      chartManager.updateChargingChart(params);

      expect(chartManager.chargingChart.data.labels).toEqual([]);
      expect(chartManager.chargingChart.data.datasets[0].data).toEqual([]);
    });

    test("should generate realistic charging curve data", () => {
      const params = {
        batteryCapacity: 52,
        currentCharge: 20,
        targetCharge: 80,
        chargingPower: 150,
        selectedVehicle: "renault-5-e-tech-52kwh",
      };

      chartManager.updateChargingChart(params);

      expect(chartManager.chargingChart.data.labels.length).toBeGreaterThan(0);
      expect(
        chartManager.chargingChart.data.datasets[0].data.length
      ).toBeGreaterThan(0);
      expect(
        chartManager.chargingChart.data.datasets[1].data.length
      ).toBeGreaterThan(0);
    });

    test("should use correct time interval for short charging sessions", () => {
      mockVehicleCurves.calculateChargingTime.mockReturnValue({
        totalTime: 20, // Short session
        totalEnergy: 15,
        timeSteps: [0, 10, 20],
        powerSteps: [150, 140, 120, 100, 80],
        finalBatteryLevel: 80,
        averagePower: 125,
      });

      const params = {
        batteryCapacity: 52,
        currentCharge: 20,
        targetCharge: 80,
        chargingPower: 150,
      };

      chartManager.updateChargingChart(params);

      // Should use 1-minute intervals for sessions <= 30 minutes
      expect(chartManager.chargingChart.data.labels[0]).toBe("0 min");
      expect(chartManager.chargingChart.data.labels[1]).toBe("1 min");
    });
  });

  describe("calculateRealisticChargingLevel", () => {
    test("should calculate realistic charging level for initial phase", () => {
      const level = chartManager.calculateRealisticChargingLevel(
        20,
        80,
        5,
        60,
        150
      );
      expect(level).toBeGreaterThan(20);
      expect(level).toBeLessThan(80);
    });

    test("should calculate realistic charging level for fast phase", () => {
      const level = chartManager.calculateRealisticChargingLevel(
        20,
        80,
        30,
        60,
        150
      );
      expect(level).toBeGreaterThan(20);
      expect(level).toBeLessThan(80);
    });

    test("should calculate realistic charging level for slow phase", () => {
      const level = chartManager.calculateRealisticChargingLevel(
        20,
        80,
        50,
        60,
        150
      );
      expect(level).toBeGreaterThan(20);
      expect(level).toBeLessThan(80);
    });

    test("should never exceed target charge level", () => {
      const level = chartManager.calculateRealisticChargingLevel(
        20,
        80,
        100,
        60,
        150
      );
      expect(level).toBeLessThanOrEqual(80);
    });

    test("should apply power factor for different charger types", () => {
      const lowPowerLevel = chartManager.calculateRealisticChargingLevel(
        20,
        80,
        30,
        60,
        3.7
      );
      const highPowerLevel = chartManager.calculateRealisticChargingLevel(
        20,
        80,
        30,
        60,
        200
      );

      expect(lowPowerLevel).toBeLessThan(highPowerLevel);
    });
  });

  // FIXME: moved to ChargingCalculator
  // describe("updateChargingSpeedInfo", () => {
  //   test("should create speed info element if it does not exist", () => {
  //     const mockParentElement = createMockElement("vehicle-details");
  //     const mockChargingPowerElement = createMockElement("chargingPower", {
  //       value: "150",
  //     });
  //     document.getElementById.mockImplementation((id) => {
  //       if (id === "vehicle-details") return mockParentElement;
  //       if (id === "chargingPower") return mockChargingPowerElement;
  //       return null;
  //     });
  //     document.createElement.mockReturnValue(createMockElement("div"));

  //     const chargingResult = {
  //       powerSteps: [150, 140, 120, 100, 80],
  //       averagePower: 125,
  //     };

  //     chartManager.updateChargingSpeedInfo(
  //       chargingResult,
  //       "renault-5-e-tech-52kwh"
  //     );

  //     expect(document.createElement).toHaveBeenCalledWith("div");
  //     expect(mockParentElement.appendChild).toHaveBeenCalled();
  //   });

  //   test("should update existing speed info element", () => {
  //     const mockSpeedInfoElement = createMockElement("chargingSpeedInfo");
  //     const mockChargingPowerElement = createMockElement("chargingPower", {
  //       value: "150",
  //     });
  //     document.getElementById.mockImplementation((id) => {
  //       if (id === "chargingSpeedInfo") return mockSpeedInfoElement;
  //       if (id === "chargingPower") return mockChargingPowerElement;
  //       return null;
  //     });

  //     const chargingResult = {
  //       powerSteps: [150, 140, 120, 100, 80],
  //       averagePower: 125,
  //     };

  //     chartManager.updateChargingSpeedInfo(
  //       chargingResult,
  //       "renault-5-e-tech-52kwh"
  //     );

  //     expect(mockSpeedInfoElement.innerHTML).toContain("Ladegeschwindigkeit");
  //     expect(mockSpeedInfoElement.innerHTML).toContain("150.0 kW"); // Max power
  //     expect(mockSpeedInfoElement.innerHTML).toContain("80.0 kW"); // Min power
  //     expect(mockSpeedInfoElement.innerHTML).toContain("125.0 kW"); // Avg power
  //   });
  // });

  describe("dataset visibility controls", () => {
    beforeEach(() => {
      const mockCanvas = createMockElement("chargingLevelChart");
      document.getElementById.mockReturnValue(mockCanvas);
      chartManager.initializeChargingChart();
    });

    test("should toggle dataset visibility", () => {
      const mockLegendItem = createMockElement("legend-item");
      const mockEyeIcon = createMockElement("eye-icon");
      const mockEyeSlashIcon = createMockElement("eye-slash-icon");

      mockLegendItem.querySelector.mockImplementation((selector) => {
        if (selector === "i.fas.fa-eye") return mockEyeIcon;
        if (selector === "i.fas.fa-eye-slash") return mockEyeSlashIcon;
        return null;
      });

      document.querySelector.mockReturnValue(mockLegendItem);

      chartManager.toggleDataset(0);

      expect(chartManager.chargingChart.data.datasets[0].hidden).toBe(true);
    });

    test("should show all datasets", () => {
      const mockLegendItem = createMockElement("legend-item");
      const mockEyeIcon = createMockElement("eye-icon");
      const mockEyeSlashIcon = createMockElement("eye-slash-icon");

      mockLegendItem.querySelector.mockImplementation((selector) => {
        if (selector === "i.fas.fa-eye") return mockEyeIcon;
        if (selector === "i.fas.fa-eye-slash") return mockEyeSlashIcon;
        return null;
      });

      document.querySelector.mockReturnValue(mockLegendItem);

      chartManager.showAllDatasets();

      expect(
        chartManager.chargingChart.data.datasets.every(
          (dataset) => dataset.hidden === false
        )
      ).toBe(true);
    });

    test("should hide all datasets except main ones", () => {
      const mockLegendItem = createMockElement("legend-item");
      const mockEyeIcon = createMockElement("eye-icon");
      const mockEyeSlashIcon = createMockElement("eye-slash-icon");

      mockLegendItem.querySelector.mockImplementation((selector) => {
        if (selector === "i.fas.fa-eye") return mockEyeIcon;
        if (selector === "i.fas.fa-eye-slash") return mockEyeSlashIcon;
        return null;
      });

      document.querySelector.mockReturnValue(mockLegendItem);

      chartManager.hideAllDatasets();

      // Main datasets should be visible, others hidden
      expect(chartManager.chargingChart.data.datasets[0].hidden).toBe(false); // Realistic
      expect(chartManager.chargingChart.data.datasets[1].hidden).toBe(false); // Linear
      expect(chartManager.chargingChart.data.datasets[2].hidden).toBe(true); // 400kW
    });
  });

  //   describe("setupLegendToggles", () => {
  //     test("should setup legend toggle event listeners", () => {
  //       const mockButton = createMockElement("legend-toggle");
  //       mockButton.dataset = { dataset: "0" };
  //       document.querySelectorAll.mockReturnValue([mockButton]);

  //       chartManager.setupLegendToggles();

  //       expect(mockButton.addEventListener).toHaveBeenCalledWith(
  //         "click",
  //         expect.any(Function)
  //       );
  //     });

  //     test("should setup show all curves button", () => {
  //       const mockButton = createMockElement("showAllCurves");
  //       document.getElementById.mockReturnValue(mockButton);

  //       chartManager.setupLegendToggles();

  //       expect(mockButton.addEventListener).toHaveBeenCalledWith(
  //         "click",
  //         expect.any(Function)
  //       );
  //     });

  //     test("should setup hide all curves button", () => {
  //       const mockButton = createMockElement("hideAllCurves");
  //       document.getElementById.mockReturnValue(mockButton);

  //       chartManager.setupLegendToggles();

  //       expect(mockButton.addEventListener).toHaveBeenCalledWith(
  //         "click",
  //         expect.any(Function)
  //       );
  //     });
  //   });
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
