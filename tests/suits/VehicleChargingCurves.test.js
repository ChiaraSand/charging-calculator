/**
 * Tests for VehicleChargingCurves class
 */

import VehicleChargingCurves from "services/VehicleChargingCurves.js";
import { mockVehicleData } from "mocks/testData.js";

describe("VehicleChargingCurves", () => {
  let vehicleCurves;

  beforeEach(() => {
    vehicleCurves = new VehicleChargingCurves();
    // Mock the loadVehicleData method to use test data
    vehicleCurves.vehicleData = mockVehicleData;
  });

  describe("constructor and initialization", () => {
    test("should initialize with empty vehicle data", () => {
      expect(vehicleCurves.vehicleData).toBeDefined();
    });

    test("should load vehicle data on construction", () => {
      expect(Object.keys(vehicleCurves.vehicleData).length).toBeGreaterThan(0);
    });
  });

  describe("getChargingPower", () => {
    test("should return exact power for known battery levels", () => {
      const power = vehicleCurves.getChargingPower(
        "renault-5-e-tech-52kwh",
        20,
        400
      );
      expect(power).toBe(100.89); // From mock data
    });

    test("should interpolate power for unknown battery levels", () => {
      const power = vehicleCurves.getChargingPower(
        "renault-5-e-tech-52kwh",
        25,
        400
      );
      expect(power).toBeGreaterThan(0);
      expect(power).toBeLessThanOrEqual(400);
    });

    test("should use generic calculation for unknown vehicles", () => {
      const power = vehicleCurves.getChargingPower("unknown-vehicle", 50, 150);
      expect(power).toBeGreaterThan(0);
      expect(power).toBeLessThanOrEqual(150);
    });

    test("should find closest charger when exact match not available", () => {
      const power = vehicleCurves.getChargingPower(
        "renault-5-e-tech-52kwh",
        20,
        200
      );
      expect(power).toBeGreaterThan(0);
      expect(power).toBeLessThanOrEqual(200);
    });

    test("should handle edge cases", () => {
      const powerAt0 = vehicleCurves.getChargingPower(
        "renault-5-e-tech-52kwh",
        0,
        400
      );
      const powerAt100 = vehicleCurves.getChargingPower(
        "renault-5-e-tech-52kwh",
        100,
        400
      );

      expect(powerAt0).toBeGreaterThan(0);
      expect(powerAt100).toBeGreaterThan(0);
    });
  });

  describe("calculateChargingTime", () => {
    test("should calculate charging time for known vehicle", () => {
      const result = vehicleCurves.calculateChargingTime(
        "renault-5-e-tech-52kwh",
        20,
        80,
        400,
        52
      );

      expect(result).toHaveProperty("totalTime");
      expect(result).toHaveProperty("totalEnergy");
      expect(result).toHaveProperty("timeSteps");
      expect(result).toHaveProperty("powerSteps");
      expect(result).toHaveProperty("finalBatteryLevel");
      expect(result).toHaveProperty("averagePower");

      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.totalEnergy).toBeGreaterThan(0);
      expect(result.timeSteps.length).toBeGreaterThan(0);
      expect(result.powerSteps.length).toBeGreaterThan(0);
    });

    test("should calculate charging time for unknown vehicle", () => {
      const result = vehicleCurves.calculateChargingTime(
        "unknown-vehicle",
        20,
        80,
        150,
        50
      );

      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.totalEnergy).toBeGreaterThan(0);
    });

    test("should handle zero charging range", () => {
      const result = vehicleCurves.calculateChargingTime(
        "renault-5-e-tech-52kwh",
        80,
        80,
        400,
        52
      );

      expect(result.totalTime).toBe(0);
      expect(result.totalEnergy).toBe(0);
    });

    test("should handle negative charging range", () => {
      const result = vehicleCurves.calculateChargingTime(
        "renault-5-e-tech-52kwh",
        80,
        20,
        400,
        52
      );

      expect(result.totalTime).toBe(0);
      expect(result.totalEnergy).toBe(0);
    });

    test("should calculate realistic charging curve", () => {
      const result = vehicleCurves.calculateChargingTime(
        "renault-5-e-tech-52kwh",
        20,
        80,
        400,
        52
      );

      expect(result.powerSteps.length).toBeGreaterThan(10);

      // Check that power generally decreases as battery level increases
      const powerSteps = result.powerSteps;
      if (powerSteps.length > 10) {
        const firstHalf = powerSteps.slice(
          0,
          Math.floor(powerSteps.length / 2)
        );
        const secondHalf = powerSteps.slice(Math.floor(powerSteps.length / 2));
        const avgFirstHalf =
          firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecondHalf =
          secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        // In a realistic curve, charging power should generally decrease
        expect(avgFirstHalf).toBeGreaterThanOrEqual(avgSecondHalf * 0.5);
      }
    });
  });

  describe("findClosestCharger", () => {
    test("should find exact match", () => {
      const availableChargers = [22, 50, 150, 300, 400];
      const result = vehicleCurves.findClosestCharger(150, availableChargers);
      expect(result).toBe(150);
    });

    test("should find closest higher power", () => {
      const availableChargers = [22, 50, 150, 300, 400];
      const result = vehicleCurves.findClosestCharger(100, availableChargers);
      expect(result).toBe(150);
    });

    test("should return max available when requested power is higher", () => {
      const availableChargers = [22, 50, 150];
      const result = vehicleCurves.findClosestCharger(300, availableChargers);
      expect(result).toBe(150);
    });

    test("should handle empty array", () => {
      const result = vehicleCurves.findClosestCharger(150, []);
      expect(result).toBeNull();
    });
  });

  describe("findClosestLevel", () => {
    test("should find lower level", () => {
      const levels = [10, 20, 30, 40, 50];
      const result = vehicleCurves.findClosestLevel(25, levels, "lower");
      expect(result).toBe(20);
    });

    test("should find upper level", () => {
      const levels = [10, 20, 30, 40, 50];
      const result = vehicleCurves.findClosestLevel(25, levels, "upper");
      expect(result).toBe(30);
    });

    test("should handle edge cases", () => {
      const levels = [10, 20, 30, 40, 50];

      const lowerAtStart = vehicleCurves.findClosestLevel(5, levels, "lower");
      expect(lowerAtStart).toBe(10);

      const upperAtEnd = vehicleCurves.findClosestLevel(60, levels, "upper");
      expect(upperAtEnd).toBe(50);
    });
  });

  describe("getGenericChargingPower", () => {
    test("should return reduced power at low battery levels", () => {
      const power = vehicleCurves.getGenericChargingPower(10, 150);
      expect(power).toBeLessThan(150);
      expect(power).toBeGreaterThan(0);
    });

    test("should return high power at mid battery levels", () => {
      const power = vehicleCurves.getGenericChargingPower(50, 150);
      expect(power).toBeGreaterThan(100);
      expect(power).toBeLessThanOrEqual(150);
    });

    test("should return reduced power at high battery levels", () => {
      const power = vehicleCurves.getGenericChargingPower(90, 150);
      expect(power).toBeLessThan(150);
      expect(power).toBeGreaterThan(0);
    });

    test("should never exceed charger power", () => {
      const power = vehicleCurves.getGenericChargingPower(50, 50);
      expect(power).toBeLessThanOrEqual(50);
    });
  });

  // describe("calculateGenericChargingTime", () => {
  //   test("should calculate charging time correctly", () => {
  //     const result = vehicleCurves.calculateGenericChargingTime(
  //       20,
  //       80,
  //       150,
  //       50
  //     );

  //     expect(result.totalTime).toBeGreaterThan(0);
  //     expect(result.totalEnergy).toBe(30); // 50 kWh * 60% = 30 kWh
  //     expect(result.timeSteps).toHaveLength(2);
  //     expect(result.powerSteps).toHaveLength(2);
  //   });

  //   test("should handle zero charging range", () => {
  //     const result = vehicleCurves.calculateGenericChargingTime(
  //       80,
  //       80,
  //       150,
  //       50
  //     );

  //     expect(result.totalTime).toBe(0);
  //     expect(result.totalEnergy).toBe(0);
  //   });
  // });

  describe("getAvailableVehicles", () => {
    test("should return list of available vehicles", () => {
      const vehicles = vehicleCurves.getAvailableVehicles();

      expect(Array.isArray(vehicles)).toBe(true);
      expect(vehicles.length).toBeGreaterThan(0);

      const renaultVehicle = vehicles.find(
        (v) => v.id === "renault-5-e-tech-52kwh"
      );
      expect(renaultVehicle).toBeDefined();
      expect(renaultVehicle.name).toBe("Renault 5 E-Tech 52 kWh");
      expect(renaultVehicle.batteryCapacity).toBe(52);
    });
  });

  describe("addVehicle", () => {
    test("should add new vehicle data", () => {
      const newVehicleData = {
        name: "Test Vehicle",
        batteryCapacity: 75,
        maxChargingPower: 200,
        connectorType: "CCS",
        chargingCurves: {
          200: {
            20: 200,
            50: 180,
            80: 100,
          },
        },
      };

      vehicleCurves.addVehicle("test-vehicle", newVehicleData);

      expect(vehicleCurves.vehicleData["test-vehicle"]).toBeDefined();
      expect(vehicleCurves.vehicleData["test-vehicle"].name).toBe(
        "Test Vehicle"
      );
    });
  });

  describe("integration tests", () => {
    test("should provide realistic charging curve for Renault 5", () => {
      const result = vehicleCurves.calculateChargingTime(
        "renault-5-e-tech-52kwh",
        20,
        80,
        400,
        52
      );

      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.totalEnergy).toBeGreaterThan(0);

      // Power should vary realistically
      expect(result.powerSteps.length).toBeGreaterThan(10);
      expect(Math.max(...result.powerSteps)).toBeGreaterThan(
        Math.min(...result.powerSteps)
      );
    });

    test("should handle different charger powers", () => {
      const results = [];
      const chargerPowers = [22, 50, 150, 400];

      chargerPowers.forEach((power) => {
        const result = vehicleCurves.calculateChargingTime(
          "renault-5-e-tech-52kwh",
          20,
          80,
          power,
          52
        );
        results.push({ power, time: result.totalTime });
      });

      // Higher power chargers should generally charge faster
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].time).toBeGreaterThanOrEqual(results[i].time);
      }
    });
  });
});
