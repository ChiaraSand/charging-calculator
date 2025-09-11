/**
 * Tariff Classes and Types for Charging Calculator
 *
 * This file contains all the class definitions for different types of tariffs,
 * providers, and related structures used in the charging calculator.
 */

// Enums for connector types and charging types
const ConnectorType = {
  TYPE_1: "TYPE_1",
  TYPE_2: "TYPE_2",
  CCS_1: "CCS_1",
  CCS_2: "CCS_2",
  CHADEMO: "CHAdeMO",
  TESLA: "TESLA",
  SCHUKO: "SCHUKO",
};

const ChargingType = {
  AC: "AC",
  DC: "DC",
};

/**
 * Base class for all blocking fee conditions
 */
class BlockingFeeCondition {
  constructor(data = {}) {
    this.whileCharging = data.whileCharging || false;
    this.whileIdle = data.whileIdle || false;
  }
}

/**
 * Time-based blocking fee condition (e.g., night cap)
 */
class TimeBasedCondition extends BlockingFeeCondition {
  constructor(data = {}) {
    super(data);
    this.description = data.daytime.description || "";
    this.from = data.daytime.from || null; // e.g., "21:00"
    this.to = data.daytime.to || null; // e.g., "07:00"
    this.maxPrice = data.daytime.maxPrice || null;
    this.maxBilledMinutes = data.daytime.maxBilledMinutes || null;
  }

  /**
   * Check if start time falls within the time window
   */
  removedBillableTimeInWindow(startTime, endTime) {
    if (!this.from || !this.to) return true;

    const startMinutes = this.timeToMinutes(startTime);
    let endMinutes = this.timeToMinutes(endTime);
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    const fromMinutes = this.timeToMinutes(this.from);
    let toMinutes = this.timeToMinutes(this.to);
    if (toMinutes < fromMinutes) {
      toMinutes += 24 * 60;
    }

    if (endMinutes < fromMinutes || startMinutes > toMinutes) {
      return 0;
    }

    // const totalTime = endTime - startTime;
    const startTimeInWindow = Math.max(startMinutes, fromMinutes);
    const endTimeInWindow = Math.min(endMinutes, toMinutes);
    const totalTimeInWindow = endTimeInWindow - startTimeInWindow;

    const removedBillableTimeInWindow =
      totalTimeInWindow - Math.min(totalTimeInWindow, this.maxBilledMinutes);

    return removedBillableTimeInWindow;

    // return totalTime
    //     if (startTime >= this.from && startTime <= this.to && endTime >= this.from && endTime <= this.to) {
    //       return this.maxBilledMinutes;
    //     }
    // else if (startTime >= this.from && startTime <= this.to) {

    // }
    //     return 0;
    t;
    // // Convert startTime string (HH:MM) to minutes since midnight
    // const startMinutes = this.timeToMinutes(startTime);
    // const endMinutes = this.timeToMinutes(endTime);
    // const fromMinutes = this.timeToMinutes(this.from);
    // const toMinutes = this.timeToMinutes(this.to);

    // // Handle overnight periods (e.g., 21:00 to 07:00)
    // if (toMinutes < fromMinutes) {
    //   return (
    //     startMinutes >= fromMinutes ||
    //     startMinutes <= toMinutes ||
    //     endMinutes >= fromMinutes ||
    //     endMinutes <= toMinutes
    //   );
    // }

    // return (
    //   (startMinutes >= fromMinutes && startMinutes <= toMinutes) ||
    //   (endMinutes >= fromMinutes && endMinutes <= toMinutes)
    // );
  }

  // FIXME: move to a better place
  timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  }

  // FIXME: move to a better place
  minutesToTime(minutes) {
    const hours = (Math.floor(minutes / 60) % 24).toString().padStart(2, "0");
    const remainingMinutes = Math.round(minutes % 60)
      .toString()
      .padStart(2, "0");
    return `${hours}:${remainingMinutes}`;
  }
}

/**
 * Duration-based blocking fee condition (e.g., after 4 hours)
 */
class DurationBasedCondition extends BlockingFeeCondition {
  constructor(data = {}) {
    super(data);
    this.description = data.description || "";
    this.from = data.from || 0; // hours
    this.maxPrice = data.maxPrice || 0;
  }

  /**
   * Check if duration exceeds the threshold
   */
  isDurationExceeded(durationHours) {
    return durationHours >= this.from;
  }
}

/**
 * Blocking fee structure for tariffs
 */
class BlockingFee {
  constructor(data = {}) {
    this.description = data.description || "";
    this.pricePerMin = data.pricePerMin || 0;
    this.conditions = this.parseConditions(data.conditions || {});
    this.maxPricePerSession = data.maxPricePerSession || false;
    this.maxPerSession = data.maxPerSession || false;
  }

  parseConditions(conditionsData) {
    const conditions = {};

    if (conditionsData.daytime) {
      conditions.daytime = new TimeBasedCondition(conditionsData);
    }

    if (conditionsData.durationHours) {
      conditions.durationHours = new DurationBasedCondition(
        conditionsData.durationHours
      );
    }

    // Copy other conditions
    Object.keys(conditionsData).forEach((key) => {
      if (!conditions[key]) {
        conditions[key] = conditionsData[key];
      }
    });

    return conditions;
  }

  /**
   * Calculate blocking fee for given parameters
   */
  calculateFee(
    blockingTimeMinutes,
    chargingTimeMinutes = 0,
    startTime,
    endTime
  ) {
    if (this.pricePerMin <= 0) return 0;

    let applicableMinutes = 0;
    let removedBillableTimeInWindow = 0;

    // Apply time-based conditions
    if (this.conditions.daytime) {
      if (startTime && endTime) {
        removedBillableTimeInWindow =
          this.conditions.daytime.removedBillableTimeInWindow(
            startTime,
            endTime
          );
      } else if (startTime) {
        removedBillableTimeInWindow =
          this.conditions.daytime.removedBillableTimeInWindow(
            startTime,
            startTime + chargingTimeMinutes
          );
      } else if (endTime) {
        removedBillableTimeInWindow =
          this.conditions.daytime.removedBillableTimeInWindow(
            endTime - chargingTimeMinutes,
            endTime
          );
      } else {
        removedBillableTimeInWindow = 0;
      }

      applicableMinutes = blockingTimeMinutes - removedBillableTimeInWindow;
    }

    // Apply duration-based conditions
    else if (this.conditions.durationHours) {
      const totalTimeHours = blockingTimeMinutes / 60;
      if (!this.conditions.durationHours.isDurationExceeded(totalTimeHours)) {
        applicableMinutes = 0;
      } else {
        applicableMinutes =
          (totalTimeHours - this.conditions.durationHours.from) * 60;
      }
    }

    // total blocking time is billed
    else {
      applicableMinutes = blockingTimeMinutes;
    }

    // TODO: while charging and while idle

    let fee = applicableMinutes * this.pricePerMin;

    // Apply maximum caps
    if (
      this.conditions.maxPricePerSession &&
      typeof this.conditions.maxPricePerSession === "number"
    ) {
      fee = Math.min(fee, this.conditions.maxPricePerSession);
    }

    if (
      this.conditions.durationHours &&
      typeof this.conditions.durationHours.maxPrice === "number"
    ) {
      fee = Math.min(fee, this.conditions.durationHours.maxPrice);
    }

    if (this.maxPerSession && typeof this.maxPerSession === "number") {
      fee = Math.min(fee, this.maxPerSession);
    }

    return fee;
  }

  getBlockingFeeString() {
    let blockingFeeString = "";
    if (this.conditions.daytime) {
      const icon =
        this.conditions.daytime.to < this.conditions.daytime.from ? "🌙" : "☀️";
      blockingFeeString =
        this.pricePerMin.toFixed(2) +
        " €/min<br/><small><i style='font-weight: normal;'>" +
        icon +
        this.conditions.daytime.from.split(":")[0] +
        "-" +
        this.conditions.daytime.to.split(":")[0] +
        "h: max " +
        this.conditions.daytime.maxPrice.toFixed(2) +
        " €</i></small>";
    } else if (this.conditions.durationHours) {
      const details = this.conditions.durationHours;
      blockingFeeString =
        "<small><i style='font-weight: normal;'>" +
        ">" +
        details.from +
        "h: " +
        this.pricePerMin.toFixed(2) +
        "€/min<br/>max " +
        details.maxPrice.toFixed(2) +
        " €</i></small>";
    } else {
      blockingFeeString =
        this.description + " " + JSON.stringify(this.conditions);
    }
    return blockingFeeString;
  }
}

/**
 * Special attributes for tariffs (e.g., Plug & Charge)
 */
class SpecialAttributes {
  constructor(data = {}) {
    this.plugAndCharge = data.plugAndCharge || false;
    this.registrationRequired = data.registrationRequired || false;
    this.membershipRequired = data.membershipRequired || false;
  }
}

/**
 * Base class for all tariffs
 */
class BaseTariff {
  constructor(data = {}) {
    this.id = data.id || "";
    this.name = data.name || data.providerName || "";
    this.description = data.description || "";
    this.type = data.type || ChargingType.AC;
    this.pricePerKwh = data.pricePerKwh || 0;
    // this.pricePerMin = data.pricePerMin || 0;
    this.baseFee = data.baseFee || false;
    this.connectors = data.connectors || [];
    this.specialAttributes = new SpecialAttributes(
      data.specialAttributes || {}
    );

    // Provider information
    this.providerId = data.providerId || "";
    this.providerName = data.providerName || "";
    this.providerType = data.providerType || null;
    this.providerUrl = data.providerUrl || "";
    this.providerConnectors = data.providerConnectors || [];

    // Parse blocking fee
    if (data.blockingFee && typeof data.blockingFee === "object") {
      this.blockingFee = new BlockingFee(data.blockingFee);
    } else {
      this.blockingFee = data.blockingFee || false;
    }
  }

  /**
   * Get the effective base fee for a charging session
   */
  getBaseFee() {
    // Handle different base fee structures
    if (typeof this.baseFee === "number") {
      return this.baseFee;
    }
    // FIXME
    // if (typeof this.baseFeePerCharge === "number") {
    //   return this.baseFeePerCharge;
    // }
    // if (typeof this.baseFeePerMonth === "number") {
    //   return this.baseFeePerMonth;
    // }
    return 0;
  }

  calculateBlockingFee(
    blockingTimeMinutes = 0,
    chargingTimeMinutes,
    startTime,
    endTime
  ) {
    if (!this.blockingFee) return 0;
    else if (typeof this.blockingFee === "object") {
      return this.blockingFee.calculateFee(
        blockingTimeMinutes,
        chargingTimeMinutes,
        startTime,
        endTime
      );
    }
  }

  /**
   * Calculate total cost for a charging session
   */
  calculateTotalCost(
    energyKwh,
    chargingTimeMinutes,
    blockingTimeMinutes = 0,
    startTime,
    endTime
  ) {
    const energyCost = energyKwh * this.pricePerKwh;
    // const timeCost = chargingTimeMinutes * this.pricePerMin;
    const baseFee = this.getBaseFee();

    let blockingFee = this.calculateBlockingFee(
      blockingTimeMinutes,
      chargingTimeMinutes,
      startTime,
      endTime
    );

    return energyCost + baseFee + blockingFee;
  }

  calculateEnergyCost(energyKwh) {
    return (energyKwh * this.pricePerKwh).toFixed(2);
  }

  /**
   * Get effective price per kWh including all fees
   */
  getEffectivePricePerKwh(
    energyKwh,
    chargingTimeMinutes,
    blockingTimeMinutes = 0,
    startTime,
    endTime
  ) {
    const totalCost = this.calculateTotalCost(
      energyKwh,
      chargingTimeMinutes,
      blockingTimeMinutes,
      startTime,
      endTime
    );
    return energyKwh > 0 ? totalCost / energyKwh : 0;
  }

  /**
   * Check if tariff is compatible with given connector types
   */
  isCompatibleWithConnectors(connectorTypes) {
    if (!this.connectors || this.connectors.length === 0) {
      // Fallback to type-based compatibility
      const typeCompatibility = {
        [ChargingType.AC]: [
          ConnectorType.TYPE_1,
          ConnectorType.TYPE_2,
          ConnectorType.SCHUKO,
        ],
        [ChargingType.DC]: [
          ConnectorType.CCS_1,
          ConnectorType.CCS_2,
          ConnectorType.CHADEMO,
          ConnectorType.TESLA,
        ],
      };
      return (
        typeCompatibility[this.type]?.some((connector) =>
          connectorTypes.includes(connector)
        ) || false
      );
    }

    return this.connectors.some((connector) =>
      connectorTypes.includes(connector)
    );
  }
}

/**
 * AC Charging Tariff
 */
class ACTariff extends BaseTariff {
  constructor(data = {}) {
    super({ ...data, type: ChargingType.AC });
    this.maxPowerKw = data.maxPowerKw || 22; // Typical AC max power
  }
}

/**
 * DC Fast Charging Tariff
 */
class DCTariff extends BaseTariff {
  constructor(data = {}) {
    super({ ...data, type: ChargingType.DC });
    this.maxPowerKw = data.maxPowerKw || 150; // Typical DC max power // REVIEW
  }
}

/**
 * Provider class containing multiple tariffs
 */
class Provider {
  constructor(data = {}) {
    this.id = data.id || "";
    this.name = data.name || "";
    this.type = data.type || null;
    this.url = data.url || "";
    this.connectors = data.connectors || [];
    this.tariffs = this.parseTariffs(data.tariffs || []);
  }

  parseTariffs(tariffsData) {
    return tariffsData
      .map((tariffData) => {
        // Determine tariff type based on data
        if (tariffData.types && Array.isArray(tariffData.types)) {
          // Handle tariffs with multiple types
          return tariffData.types.map((type) => {
            const tariffDataWithType = { ...tariffData, type };
            return this.createTariffInstance(tariffDataWithType);
          });
        } else {
          return this.createTariffInstance(tariffData);
        }
      })
      .flat();
  }

  createTariffInstance(tariffData) {
    const tariffType = tariffData.type || this.type;

    // Add provider information to tariff data
    const tariffDataWithProvider = {
      ...tariffData,
      providerId: this.id,
      providerName: this.name,
      providerType: this.type,
      providerUrl: this.url,
      providerConnectors: this.connectors,
    };

    switch (tariffType) {
      case ChargingType.AC:
        return new ACTariff(tariffDataWithProvider);
      case ChargingType.DC:
        return new DCTariff(tariffDataWithProvider);
      default:
        return new BaseTariff(tariffDataWithProvider);
    }
  }

  /**
   * Get tariffs filtered by type
   */
  getTariffsByType(type) {
    return this.tariffs.filter((tariff) => tariff.type === type);
  }

  /**
   * Get tariffs compatible with given connectors
   */
  getCompatibleTariffs(connectorTypes) {
    return this.tariffs.filter((tariff) =>
      tariff.isCompatibleWithConnectors(connectorTypes)
    );
  }
}

/**
 * Tariff Manager for handling multiple providers and tariffs
 */
class TariffManager {
  constructor() {
    this.providers = [];
    this.tariffs = [];
  }

  /**
   * Load tariffs from JSON data
   */
  loadFromJson(jsonData) {
    this.providers = jsonData.map((providerData) => new Provider(providerData));
    this.tariffs = this.providers.flatMap((provider) => provider.tariffs);
  }

  /**
   * Get all tariffs filtered by criteria
   */
  getFilteredTariffs(filters = {}) {
    let filtered = [...this.tariffs];

    if (filters.providers && filters.providers.length > 0) {
      filtered = filtered.filter((tariff) =>
        filters.providers.some(
          (provider) =>
            tariff.providerName === provider || tariff.providerId === provider
        )
      );
    }

    if (filters.connectors && filters.connectors.length > 0) {
      filtered = filtered.filter((tariff) =>
        tariff.isCompatibleWithConnectors(filters.connectors)
      );
    }

    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter((tariff) =>
        filters.types.includes(tariff.type)
      );
    }

    return filtered;
  }

  /**
   * Sort tariffs by total cost for given parameters
   */
  sortByCost(
    tariffs,
    energyKwh,
    chargingTimeMinutes,
    blockingTimeMinutes = 0,
    startTime,
    endTime
  ) {
    return tariffs
      .map((tariff) => ({
        tariff,
        baseFee: tariff.getBaseFee(),
        totalCost: tariff.calculateTotalCost(
          energyKwh,
          chargingTimeMinutes,
          blockingTimeMinutes,
          startTime,
          endTime
        ),
        blockingFee: tariff.calculateBlockingFee(
          blockingTimeMinutes,
          chargingTimeMinutes,
          startTime,
          endTime
        ),
        blockingFeeString:
          (tariff.blockingFee &&
            typeof tariff.blockingFee === "object" &&
            tariff.blockingFee.getBlockingFeeString()) ||
          (typeof tariff.blockingFee === "number" && tariff.blockingFee > 0) ||
          "-",
        effectivePricePerKwh: tariff.getEffectivePricePerKwh(
          energyKwh,
          chargingTimeMinutes,
          blockingTimeMinutes,
          startTime,
          endTime
        ),
      }))
      .sort((a, b) => a.totalCost - b.totalCost);
  }

  /**
   * Get unique provider names
   */
  getUniqueProviders() {
    return [...new Set(this.providers.map((provider) => provider.name))];
  }

  /**
   * Get unique connector types
   */
  getUniqueConnectors() {
    const connectors = new Set();
    this.tariffs.forEach((tariff) => {
      tariff.connectors.forEach((connector) => connectors.add(connector));
    });
    return [...connectors];
  }
}

// Export classes and enums
if (typeof module !== "undefined" && module.exports) {
  // Node.js environment
  module.exports = {
    ConnectorType,
    ChargingType,
    BlockingFeeCondition,
    TimeBasedCondition,
    DurationBasedCondition,
    BlockingFee,
    SpecialAttributes,
    BaseTariff,
    ACTariff,
    DCTariff,
    Provider,
    TariffManager,
  };
} else {
  // Browser environment
  window.TariffClasses = {
    ConnectorType,
    ChargingType,
    BlockingFeeCondition,
    TimeBasedCondition,
    DurationBasedCondition,
    BlockingFee,
    SpecialAttributes,
    BaseTariff,
    ACTariff,
    DCTariff,
    Provider,
    TariffManager,
  };
}
