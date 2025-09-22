/**
 * Integration tests for ChargingCalculator main class
 */

import ChargingCalculator from "../../pages/calculator/calculator.js";

import {
  mockTariffData,
  mockVehicleData,
  mockConnectorData,
  mockPresets,
  mockProviderGroups,
  mockChargingPowers,
  mockInputFields,
  setupFetchMocks,
  createMockElement,
} from "../mocks/testData.js";

describe("ChargingCalculator Integration Tests", () => {
  let calculator;
  let mockElements;

  beforeEach(() => {
    // Setup fetch mocks
    setupFetchMocks();

    // Create mock DOM elements
    mockElements = {
      batteryCapacity: createMockElement("batteryCapacity", { value: "52" }),
      currentCharge: createMockElement("currentCharge", { value: "20" }),
      targetCharge: createMockElement("targetCharge", { value: "80" }),
      chargingPower: createMockElement("chargingPower", { value: "150" }),
      startTime: createMockElement("startTime", { value: "10:00" }),
      endTime: createMockElement("endTime", { value: "11:00" }),
      currentChargeValue: createMockElement("currentChargeValue"),
      targetChargeValue: createMockElement("targetChargeValue"),
      quickChargingPower: createMockElement("quickChargingPower"),
      energyToCharge: createMockElement("energyToCharge"),
      estimatedTime: createMockElement("estimatedTime"),
      totalParkingTime: createMockElement("totalParkingTime"),
      tariffTableBody: createMockElement("tariffTableBody"),
      providerCheckboxes: createMockElement("providerCheckboxes"),
      connectorCheckboxes: createMockElement("connectorCheckboxes"),
      pricePerSelectedKwh: createMockElement("pricePerSelectedKwh"),
      customPricePerKwh: createMockElement("custom-price-per-kwh", {
        value: "0.50",
      }),
      customBaseFee: createMockElement("custom-base-fee", { value: "0.0" }),
      customBlockingFee: createMockElement("custom-blocking-fee", {
        value: "0.10",
      }),
      customPricePerSelectedKwh: createMockElement(
        "custom-price-per-selected-kwh"
      ),
      customBlockingFeeCost: createMockElement("custom-blocking-fee-cost"),
      customTotalCost: createMockElement("custom-total-cost"),
      customEffectivePrice: createMockElement("custom-effective-price"),
    };

    // Setup document.getElementById mock
    document.getElementById.mockImplementation(
      (id) => mockElements[id] || null
    );

    // Setup document.querySelectorAll mock
    document.querySelectorAll.mockReturnValue([]);

    // Setup document.createElement mock
    document.createElement.mockImplementation((tagName) =>
      createMockElement(tagName)
    );

    calculator = new ChargingCalculator();
  });

  describe("initialization", () => {
    test("should initialize with correct default values", () => {
      expect(calculator.selectedVehicle).toBe("renault-5-e-tech-52kwh");
      expect(calculator.selectedProviders).toBeInstanceOf(Set);
      expect(calculator.selectedConnectors).toBeInstanceOf(Set);
    });

    test("should load data from JSON files", async () => {
      await calculator.loadDataFromJson();

      expect(calculator.presets).toBeDefined();
      expect(calculator.connectorData).toBeDefined();
      expect(calculator.providerGroups).toBeDefined();
      expect(calculator.chargingPowers).toBeDefined();
      expect(calculator.inputFields).toBeDefined();
    });

    test("should load tariff data", async () => {
      await calculator.loadTariffs();

      expect(calculator.tariffs).toHaveLength(4);
      expect(calculator.tariffManager.tariffs).toHaveLength(4);
    });
  });

  describe("calculations", () => {
    test("should calculate charging parameters correctly", () => {
      calculator.updateCalculations();

      expect(mockElements.energyToCharge.textContent).toContain("kWh");
      expect(mockElements.estimatedTime.textContent).toContain("min");
      expect(mockElements.totalParkingTime.textContent).toContain("min");
    });

    test("should show placeholder values for invalid inputs", () => {
      mockElements.batteryCapacity.value = "0";
      mockElements.currentCharge.value = "80";
      mockElements.targetCharge.value = "20";

      calculator.updateCalculations();

      expect(mockElements.energyToCharge.textContent).toBe("— kWh");
      expect(mockElements.estimatedTime.textContent).toBe("— min");
      expect(mockElements.totalParkingTime.textContent).toBe("— min");
    });

    test("should calculate energy to charge correctly", () => {
      mockElements.batteryCapacity.value = "50";
      mockElements.currentCharge.value = "20";
      mockElements.targetCharge.value = "80";

      calculator.updateCalculations();

      // 50 kWh * (80% - 20%) = 30 kWh
      expect(mockElements.energyToCharge.textContent).toContain("30.0 kWh");
    });
  });

  describe("tariff table population", () => {
    test("should populate tariff table with valid inputs", () => {
      calculator.populateTariffTable();

      expect(mockElements.tariffTableBody.innerHTML).toContain("provider-name");
      expect(mockElements.tariffTableBody.innerHTML).toContain("€/kWh");
    });

    test("should show placeholder message for invalid inputs", () => {
      mockElements.batteryCapacity.value = "0";

      calculator.populateTariffTable();

      expect(mockElements.tariffTableBody.innerHTML).toContain(
        "Bitte füllen Sie alle erforderlichen Felder aus"
      );
    });

    test("should include custom tariff row", () => {
      calculator.populateTariffTable();

      expect(mockElements.tariffTableBody.innerHTML).toContain("Eigener Tarif");
      expect(mockElements.tariffTableBody.innerHTML).toContain(
        "custom-tariff-row"
      );
    });
  });

  describe("provider and connector filtering", () => {
    test("should populate provider filters", () => {
      calculator.populateProviderFilters();

      expect(mockElements.providerCheckboxes.innerHTML).toContain(
        "checkbox-item"
      );
      expect(calculator.selectedProviders.size).toBeGreaterThan(0);
    });

    test("should populate connector filters", () => {
      calculator.populateConnectorFilters();

      expect(mockElements.connectorCheckboxes.innerHTML).toContain(
        "checkbox-item"
      );
      expect(calculator.selectedConnectors.size).toBeGreaterThan(0);
    });

    test("should select all providers", () => {
      calculator.selectAll("providers");

      expect(calculator.selectedProviders.size).toBeGreaterThan(0);
    });

    test("should select no providers", () => {
      calculator.selectNo("providers");

      expect(calculator.selectedProviders.size).toBe(0);
    });

    test("should select all connectors", () => {
      calculator.selectAll("connectors");

      expect(calculator.selectedConnectors.size).toBeGreaterThan(0);
    });

    test("should select no connectors", () => {
      calculator.selectNo("connectors");

      expect(calculator.selectedConnectors.size).toBe(0);
    });
  });

  describe("input clearing", () => {
    test("should clear individual input", () => {
      const originalValue = mockElements.batteryCapacity.value;
      calculator.clearInput("batteryCapacity");

      expect(mockElements.batteryCapacity.value).toBe("");
    });

    test("should clear range input and update display", () => {
      calculator.clearInput("currentCharge");

      expect(mockElements.currentCharge.value).toBe("0");
      expect(mockElements.currentChargeValue.textContent).toBe("0%");
    });

    test("should clear all inputs", () => {
      calculator.clearAllInputs();

      expect(mockElements.batteryCapacity.value).toBe("");
      expect(mockElements.currentCharge.value).toBe("0");
      expect(mockElements.targetCharge.value).toBe("0");
    });
  });

  describe("custom tariff functionality", () => {
    test("should create custom tariff row", () => {
      const customRow = calculator.createCustomBlockingFeeRow();

      expect(customRow).toContain("Eigener Tarif");
      expect(customRow).toContain("custom-price-per-kwh");
      expect(customRow).toContain("custom-blocking-fee");
    });

    test("should update custom tariff display", () => {
      calculator.updateCustomTariffDisplay(30);

      expect(mockElements.customPricePerSelectedKwh.textContent).toContain("€");
      expect(mockElements.customBlockingFeeCost.textContent).toContain("€");
      expect(mockElements.customTotalCost.textContent).toContain("€");
      expect(mockElements.customEffectivePrice.textContent).toContain("€");
    });

    test("should setup custom tariff event listeners", () => {
      const mockInput = createMockElement("custom-tariff-input");
      document.querySelectorAll.mockReturnValue([mockInput]);

      calculator.setupCustomTariffEventListeners();

      expect(mockInput.addEventListener).toHaveBeenCalledWith(
        "input",
        expect.any(Function)
      );
    });
  });

  describe("time cost calculation", () => {
    test("should calculate time cost for simple price per minute", () => {
      const tariff = { pricePerMin: 0.1 };
      const timeCost = calculator.calculateTimeCost(tariff, 60);

      expect(timeCost).toBe(6.0); // 60 minutes * 0.10 €/min
    });

    test("should calculate time cost with blocking fee", () => {
      const tariff = {
        blockingFee: {
          pricePerMin: 0.05,
          maxPerSession: 5.0,
        },
      };
      const timeCost = calculator.calculateTimeCost(tariff, 120);

      expect(timeCost).toBe(5.0); // Capped at maxPerSession
    });

    test("should return zero for tariffs without time cost", () => {
      const tariff = { pricePerKwh: 0.5 };
      const timeCost = calculator.calculateTimeCost(tariff, 60);

      expect(timeCost).toBe(0);
    });
  });

  describe("integration scenarios", () => {
    test("should handle complete charging scenario", () => {
      // Set up a realistic charging scenario
      mockElements.batteryCapacity.value = "52";
      mockElements.currentCharge.value = "20";
      mockElements.targetCharge.value = "80";
      mockElements.chargingPower.value = "150";
      mockElements.startTime.value = "10:00";
      mockElements.endTime.value = "11:30";

      calculator.updateCalculations();
      calculator.populateTariffTable();

      // Verify calculations are performed
      expect(mockElements.energyToCharge.textContent).toContain("kWh");
      expect(mockElements.estimatedTime.textContent).toContain("min");

      // Verify tariff table is populated
      expect(mockElements.tariffTableBody.innerHTML).toContain("€/kWh");
    });

    test("should handle different vehicle selection", () => {
      calculator.selectedVehicle = "generic";

      calculator.updateCalculations();

      // Should still work with generic vehicle
      expect(mockElements.energyToCharge.textContent).toContain("kWh");
    });

    test("should handle empty tariff data gracefully", () => {
      calculator.tariffs = [];
      calculator.tariffManager = {
        getFilteredTariffs: () => [],
        sortByCost: () => [],
      };

      calculator.populateTariffTable();

      // Should not throw error and should show custom tariff row
      expect(mockElements.tariffTableBody.innerHTML).toContain("Eigener Tarif");
    });
  });
});
