/**
 * Vehicle-specific charging curve data and calculations
 * Based on real-world charging data from various sources
 */

import JsonLoader from "../utils/JsonLoader.js";

class VehicleChargingCurves {
  constructor() {
    this.vehicleData = {};
    this.loadVehicleData();
  }

  async loadVehicleData() {
    try {
      this.vehicleData = await JsonLoader.loadAsset("data/vehicles.json");
    } catch (error) {
      console.error(
        "[VehicleChargingCurves] Error loading data from JSON:",
        error
      );
    }
  }

  /**
   * Get charging power for a specific battery level and charger power
   * @param {string} vehicleId - Vehicle identifier
   * @param {number} batteryLevel - Current battery level (0-100)
   * @param {number} chargerPower - Available charger power (kW)
   * @returns {number} Actual charging power (kW)
   */
  getChargingPower(vehicleId, batteryLevel, chargerPower) {
    const vehicle = this.vehicleData[vehicleId] || this.vehicleData["generic"];

    // Find the closest charger power curve
    const availableChargers = Object.keys(vehicle.chargingCurves)
      .map(Number)
      .sort((a, b) => a - b);
    const selectedCharger = this.findClosestCharger(
      chargerPower,
      availableChargers
    );

    if (!selectedCharger) {
      return this.getGenericChargingPower(batteryLevel, chargerPower);
    }

    const curve =
      vehicle.chargingCurves[selectedCharger.toString()] ||
      vehicle.chargingCurves[400];
    const batteryLevelRounded = Math.round(batteryLevel);

    // Find exact match or interpolate between closest levels
    if (curve[batteryLevelRounded.toString()]) {
      return curve[batteryLevelRounded.toString()];
    }

    // Interpolate between closest battery levels
    const levels = Object.keys(curve)
      .map(Number)
      .sort((a, b) => a - b);
    const lowerLevel = this.findClosestLevel(batteryLevel, levels, "lower");
    const upperLevel = this.findClosestLevel(batteryLevel, levels, "upper");

    if (lowerLevel === upperLevel) {
      return curve[lowerLevel.toString()];
    }

    // Linear interpolation
    const lowerPower = curve[lowerLevel.toString()];
    const upperPower = curve[upperLevel.toString()];
    const ratio = (batteryLevel - lowerLevel) / (upperLevel - lowerLevel);

    return lowerPower + (upperPower - lowerPower) * ratio;
  }

  /**
   * Calculate realistic charging time using vehicle-specific curves
   * @param {string} vehicleId - Vehicle identifier
   * @param {number} currentLevel - Current battery level (0-100)
   * @param {number} targetLevel - Target battery level (0-100)
   * @param {number} chargerPower - Available charger power (kW)
   * @param {number} batteryCapacity - Battery capacity in kWh
   * @returns {Object} Charging time calculation result
   */
  calculateChargingTime(
    vehicleId,
    currentLevel,
    targetLevel,
    chargerPower,
    batteryCapacity
  ) {
    const vehicle = this.vehicleData[vehicleId] || this.vehicleData.generic;
    // if (!vehicle) {
    // return this.calculateGenericChargingTime(
    //   currentLevel,
    //   targetLevel,
    //   chargerPower,
    //   batteryCapacity
    // );
    // }

    const timeSteps = [];
    const powerSteps = [];
    let currentBatteryLevel = currentLevel;
    let totalTime = 0;
    let totalEnergy = 0;

    // Calculate in 1% increments
    const stepSize = 1;
    const maxSteps = Math.ceil((targetLevel - currentLevel) / stepSize);

    for (
      let step = 0;
      step < maxSteps && currentBatteryLevel < targetLevel;
      step++
    ) {
      const chargingPower = this.getChargingPower(
        vehicleId,
        currentBatteryLevel,
        chargerPower
      );
      const actualPower = Math.min(chargingPower, chargerPower);

      // Energy needed for this 1% step
      const energyForStep = (batteryCapacity * stepSize) / 100;

      // Time for this step (in minutes)
      const timeForStep = (energyForStep / actualPower) * 60;

      timeSteps.push(totalTime);
      powerSteps.push(actualPower);

      totalTime += timeForStep;
      totalEnergy += energyForStep;
      currentBatteryLevel += stepSize;
    }

    return {
      totalTime: totalTime,
      totalEnergy: totalEnergy,
      timeSteps: timeSteps,
      powerSteps: powerSteps,
      finalBatteryLevel: Math.min(currentBatteryLevel, targetLevel),
      averagePower: totalEnergy > 0 ? totalEnergy / (totalTime / 60) : 0,
    };
  }

  /**
   * Find the closest available charger power
   * @param {number} requestedPower - Requested charger power
   * @param {Array} availableChargers - Available charger powers
   * @returns {number|null} Closest charger power or null
   */
  findClosestCharger(requestedPower, availableChargers) {
    if (availableChargers.length === 0) return null;

    // If requested power is higher than max available, use max
    if (requestedPower >= Math.max(...availableChargers)) {
      return Math.max(...availableChargers);
    }

    // Find the closest charger that's >= requested power
    const suitableChargers = availableChargers.filter(
      (power) => power >= requestedPower
    );
    if (suitableChargers.length > 0) {
      return Math.min(...suitableChargers);
    }

    // If no suitable charger found, use the highest available
    return Math.max(...availableChargers);
  }

  /**
   * Find closest battery level for interpolation
   * @param {number} targetLevel - Target battery level
   * @param {Array} availableLevels - Available battery levels
   * @param {string} direction - 'lower' or 'upper'
   * @returns {number} Closest level
   */
  findClosestLevel(targetLevel, availableLevels, direction) {
    if (direction === "lower") {
      const lowerLevels = availableLevels.filter(
        (level) => level <= targetLevel
      );
      return lowerLevels.length > 0
        ? Math.max(...lowerLevels)
        : availableLevels[0];
    } else {
      const upperLevels = availableLevels.filter(
        (level) => level >= targetLevel
      );
      return upperLevels.length > 0
        ? Math.min(...upperLevels)
        : availableLevels[availableLevels.length - 1];
    }
  }

  /**
   * Generic charging power calculation for unknown vehicles
   * @param {number} batteryLevel - Current battery level (0-100)
   * @param {number} chargerPower - Available charger power (kW)
   * @returns {number} Estimated charging power (kW)
   */
  getGenericChargingPower(batteryLevel, chargerPower) {
    // Generic charging curve approximation
    let powerFactor = 1;

    if (batteryLevel < 20) {
      // Slow initial charging
      powerFactor = 0.3 + (batteryLevel / 20) * 0.4;
    } else if (batteryLevel < 80) {
      // Fast charging phase
      powerFactor = 0.7 + ((batteryLevel - 20) / 60) * 0.3;
    } else {
      // Slower charging at high levels
      powerFactor = 1 - ((batteryLevel - 80) / 20) * 0.6;
    }

    return Math.min(chargerPower * powerFactor, chargerPower);
  }

  /**
   * Generic charging time calculation for unknown vehicles
   * @param {number} currentLevel - Current battery level (0-100)
   * @param {number} targetLevel - Target battery level (0-100)
   * @param {number} chargerPower - Available charger power (kW)
   * @param {number} batteryCapacity - Battery capacity in kWh
   * @returns {Object} Charging time calculation result
   */
  calculateGenericChargingTime(
    currentLevel,
    targetLevel,
    chargerPower,
    batteryCapacity
  ) {
    const energyNeeded = (batteryCapacity * (targetLevel - currentLevel)) / 100;
    const averagePower = chargerPower * 1; //0.8; // Assume 80% average efficiency
    const totalTime = (energyNeeded / averagePower) * 60; // in minutes

    return {
      totalTime: totalTime,
      totalEnergy: energyNeeded,
      timeSteps: [0, totalTime],
      powerSteps: [chargerPower, chargerPower],
      finalBatteryLevel: targetLevel,
      averagePower: averagePower,
    };
  }

  /**
   * Get available vehicles
   * @returns {Array} List of available vehicles
   */
  getAvailableVehicles() {
    return Object.keys(this.vehicleData).map((id) => ({
      id: id,
      name: this.vehicleData[id].name,
      batteryCapacity: this.vehicleData[id].batteryCapacity,
      maxChargingPower: this.vehicleData[id].maxChargingPower,
      connectorType: this.vehicleData[id].connectorType,
    }));
  }

  /**
   * Add new vehicle data
   * @param {string} vehicleId - Vehicle identifier
   * @param {Object} vehicleData - Vehicle data
   */
  addVehicle(vehicleId, vehicleData) {
    this.vehicleData[vehicleId] = vehicleData;
  }
}

export default VehicleChargingCurves;

// loadFallbackVehicleData() {
//   this.vehicleData = {
//     "renault-5-e-tech-52kwh": {
//       name: "Renault 5 E-Tech 52 kWh",
//       batteryCapacity: 52,
//       maxChargingPower: 100,
//       connectorType: "CCS",
//       chargingCurves: {
//         400: {
//           // 400kW charger data from the provided chart
//           14: 100.39,
//           15: 100.56,
//           16: 100.96,
//           17: 100.93,
//           18: 100.93,
//           19: 100.96,
//           20: 100.89,
//           21: 100.89,
//           22: 100.95,
//           23: 100.88,
//           24: 100.95,
//           25: 100.95,
//           26: 100.59,
//           27: 99.68,
//           28: 98.28,
//           29: 97.45,
//           30: 96.05,
//           31: 95.35,
//           32: 94.56,
//           33: 93.61,
//           34: 93.16,
//           35: 92.5,
//           36: 91.76,
//           37: 91.46,
//           38: 91.14,
//           39: 90.57,
//           40: 88.88,
//           41: 87.86,
//           42: 86.94,
//           43: 84.93,
//           44: 83.89,
//           45: 82.51,
//           46: 81.66,
//           47: 80.24,
//           48: 78.74,
//           49: 76.19,
//           50: 75.86,
//           51: 76.19,
//           52: 76.2,
//           53: 75.43,
//           54: 73.26,
//           55: 71.48,
//           56: 70.56,
//           57: 69.34,
//           58: 67.97,
//           59: 66.54,
//           60: 65.65,
//           61: 65.5,
//           62: 65.75,
//           63: 64.07,
//           64: 61.15,
//           65: 60.56,
//           66: 60.44,
//           67: 60.58,
//           68: 60.87,
//           69: 60.83,
//           70: 59.69,
//           71: 58.76,
//           72: 57.37,
//           73: 56.39,
//           74: 55.78,
//           75: 55.05,
//           76: 54.17,
//           77: 53.02,
//           78: 52.14,
//           79: 51.1,
//           80: 41.85,
//           81: 39.94,
//           82: 37.66,
//           83: 36.2,
//           84: 33.76,
//           85: 33.43,
//           86: 33.64,
//           87: 34.13,
//           88: 33.25,
//           89: 32.7,
//           90: 32.03,
//           91: 31.95,
//           92: 31.98,
//           93: 28.39,
//           94: 22.62,
//           95: 18.64,
//           96: 18.39,
//           97: 14.62,
//         },
//       },
//     },
//   };
// }
