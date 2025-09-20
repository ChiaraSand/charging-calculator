/**
 * Tariff Classes and Types for Charging Calculator
 *
 * This file contains all the class definitions for different types of tariffs,
 * providers, and related structures used in the charging calculator.
 */

import JsonLoader from "../utils/JsonLoader.js";
import DateTimeHelper from "../utils/DateTimeHelper.js";

// Enums for connector types and charging types
let ConnectorType = {};
let ChargingType = {
  AC: "AC",
  DC: "DC",
};

// Load enums from JSON files
async function loadEnums() {
  try {
    const [connectorData] = await Promise.all([
      JsonLoader.loadAsset("data/connectors.json"),
    ]);

    ConnectorType = connectorData.enumValues || {};
  } catch (error) {
    console.error("[TariffClasses] Error loading enums from JSON:", error);
  }
}

// Initialize enums
loadEnums();

/**
 * Time range for time-based pricing
 */
class TimeRange {
  constructor(data = {}) {
    this.from = data.from || "00:00"; // e.g., "09:00"
    this.to = data.to || "23:59"; // e.g., "22:00"
    this.pricePerMin = data.pricePerMin || 0;
    this.maxPrice = data.maxPrice || null;
    this.maxBilledMinutes = data.maxBilledMinutes || null;
  }

  /**
   * Check if a time falls within this range
   */
  isTimeInRange(timeString) {
    const timeMinutes = DateTimeHelper.timeToMinutes(timeString);
    const fromMinutes = DateTimeHelper.timeToMinutes(this.from);
    let toMinutes = DateTimeHelper.timeToMinutes(this.to);

    // Handle overnight ranges (e.g., 22:00 to 09:00)
    if (toMinutes < fromMinutes) {
      toMinutes += 24 * 60;
      return timeMinutes >= fromMinutes || timeMinutes <= toMinutes - 24 * 60;
    }

    return timeMinutes >= fromMinutes && timeMinutes <= toMinutes;
  }

  /**
   * Get the price per minute for a given time
   */
  getPriceForTime(timeString) {
    return this.isTimeInRange(timeString) ? this.pricePerMin : 0;
  }
}

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
    this.description = data.description || "";
    this.timeRanges = data.timeRanges
      ? data.timeRanges.map((range) => new TimeRange(range))
      : [];
  }

  /**
   * Check if start time falls within the time window
   */
  removedBillableTimeInWindow(startTime, endTime) {
    if (!this.timeRanges || this.timeRanges.length === 0) return 0;

    const startMinutes = DateTimeHelper.timeToMinutes(startTime);
    let endMinutes = DateTimeHelper.timeToMinutes(endTime);
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    let totalRemovedTime = 0;

    // Check each time range
    for (const timeRange of this.timeRanges) {
      const fromMinutes = DateTimeHelper.timeToMinutes(timeRange.from);
      let toMinutes = DateTimeHelper.timeToMinutes(timeRange.to);
      if (toMinutes < fromMinutes) {
        toMinutes += 24 * 60;
      }

      // Check if the charging session overlaps with this time range
      if (endMinutes >= fromMinutes && startMinutes <= toMinutes) {
        const startTimeInWindow = Math.max(startMinutes, fromMinutes);
        const endTimeInWindow = Math.min(endMinutes, toMinutes);
        const totalTimeInWindow = endTimeInWindow - startTimeInWindow;

        // Apply max billed minutes if specified
        if (timeRange.maxBilledMinutes) {
          const removedTime =
            totalTimeInWindow -
            Math.min(totalTimeInWindow, timeRange.maxBilledMinutes);
          totalRemovedTime += removedTime;
        }
      }
    }

    return totalRemovedTime;
  }
}

/**
 * Duration-based blocking fee condition (e.g., after 4 hours or 45 minutes)
 */
class DurationBasedCondition extends BlockingFeeCondition {
  constructor(data = {}) {
    super(data);
    this.description = data.description || "";
    this.from = data.from || 0;
    this.maxPrice = data.maxPrice || 0;
    this.unit = data.unit || "hours"; // "hours" or "minutes"
  }

  /**
   * Check if duration exceeds the threshold
   */
  isDurationExceeded(durationHours) {
    if (this.unit === "minutes") {
      const durationMinutes = durationHours * 60;
      return durationMinutes >= this.from;
    }
    return durationHours >= this.from;
  }

  /**
   * Get the excess duration in the appropriate unit
   */
  getExcessDuration(durationHours) {
    if (this.unit === "minutes") {
      const durationMinutes = durationHours * 60;
      return Math.max(0, durationMinutes - this.from);
    }
    return Math.max(0, durationHours - this.from);
  }
}

/**
 * Provider-specific blocking fee condition
 */
class ProviderBasedCondition extends BlockingFeeCondition {
  constructor(data = {}) {
    super(data);
    this.providerId = data.providerId || "";
    this.pricePerMin = data.pricePerMin || 0;
    this.conditions = this.parseConditions(data.conditions || {});
  }

  parseConditions(conditionsData) {
    const conditions = {};

    if (conditionsData.daytime) {
      conditions.daytime = new TimeBasedCondition(conditionsData.daytime);
    }

    if (conditionsData.durationHours) {
      conditions.durationHours = new DurationBasedCondition({
        ...conditionsData.durationHours,
        unit: "hours",
      });
    }

    if (conditionsData.durationMinutes) {
      conditions.durationMinutes = new DurationBasedCondition({
        ...conditionsData.durationMinutes,
        unit: "minutes",
      });
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
   * Calculate blocking fee for this specific provider
   */
  calculateFee(
    blockingTimeMinutes,
    chargingTimeMinutes = 0,
    startTime,
    endTime,
    providerId = null
  ) {
    if (this.pricePerMin <= 0) return 0;
    if (providerId && this.providerId !== providerId) return 0;

    let applicableMinutes = 0;

    // Apply time-based conditions
    if (this.conditions.daytime) {
      // Use the time-based condition logic
      const timeCondition = this.conditions.daytime;
      let removedBillableTimeInWindow = 0;

      if (startTime && endTime) {
        removedBillableTimeInWindow = timeCondition.removedBillableTimeInWindow(
          startTime,
          endTime
        );
      } else if (startTime) {
        removedBillableTimeInWindow = timeCondition.removedBillableTimeInWindow(
          startTime,
          startTime + chargingTimeMinutes
        );
      } else if (endTime) {
        removedBillableTimeInWindow = timeCondition.removedBillableTimeInWindow(
          endTime - chargingTimeMinutes,
          endTime
        );
      }

      applicableMinutes = blockingTimeMinutes - removedBillableTimeInWindow;

      // Calculate fee based on time ranges instead of base price
      if (timeCondition.timeRanges && timeCondition.timeRanges.length > 0) {
        let totalFee = 0;
        const startMinutes = DateTimeHelper.timeToMinutes(startTime);
        let endMinutes = DateTimeHelper.timeToMinutes(endTime);
        if (endMinutes < startMinutes) {
          endMinutes += 24 * 60;
        }

        for (const timeRange of timeCondition.timeRanges) {
          const fromMinutes = DateTimeHelper.timeToMinutes(timeRange.from);
          let toMinutes = DateTimeHelper.timeToMinutes(timeRange.to);
          if (toMinutes < fromMinutes) {
            toMinutes += 24 * 60;
          }

          // Check if the charging session overlaps with this time range
          if (endMinutes >= fromMinutes && startMinutes <= toMinutes) {
            const startTimeInWindow = Math.max(startMinutes, fromMinutes);
            const endTimeInWindow = Math.min(endMinutes, toMinutes);
            const timeInWindow = endTimeInWindow - startTimeInWindow;

            // Apply max billed minutes if specified
            const billableTime = timeRange.maxBilledMinutes
              ? Math.min(timeInWindow, timeRange.maxBilledMinutes)
              : timeInWindow;

            totalFee += billableTime * timeRange.pricePerMin;
          }
        }

        return totalFee;
      }
    }
    // Apply duration-based conditions
    else if (this.conditions.durationHours) {
      const totalTimeHours = blockingTimeMinutes / 60;
      if (!this.conditions.durationHours.isDurationExceeded(totalTimeHours)) {
        applicableMinutes = 0;
      } else {
        applicableMinutes =
          this.conditions.durationHours.getExcessDuration(totalTimeHours) * 60;
      }
    } else if (this.conditions.durationMinutes) {
      const totalTimeMinutes = blockingTimeMinutes;
      if (
        !this.conditions.durationMinutes.isDurationExceeded(
          totalTimeMinutes / 60
        )
      ) {
        applicableMinutes = 0;
      } else {
        applicableMinutes = this.conditions.durationMinutes.getExcessDuration(
          totalTimeMinutes / 60
        );
      }
    }
    // No specific conditions, bill all blocking time
    else {
      applicableMinutes = blockingTimeMinutes;
    }

    return applicableMinutes * this.pricePerMin;
  }
}

/**
 * Blocking fee
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

    // Handle provider-specific conditions
    if (conditionsData.providerSpecific) {
      conditions.providerSpecific = {};
      Object.keys(conditionsData.providerSpecific).forEach((providerId) => {
        const providerData = conditionsData.providerSpecific[providerId];
        if (providerData === false) {
          conditions.providerSpecific[providerId] = false;
        } else {
          conditions.providerSpecific[providerId] = new ProviderBasedCondition({
            providerId,
            ...providerData,
          });
        }
      });
    }

    // Handle legacy conditions
    if (conditionsData.daytime) {
      conditions.daytime = new TimeBasedCondition(conditionsData.daytime);
    }

    if (conditionsData.durationHours) {
      conditions.durationHours = new DurationBasedCondition({
        ...conditionsData.durationHours,
        unit: "hours",
      });
    }

    if (conditionsData.durationMinutes) {
      conditions.durationMinutes = new DurationBasedCondition({
        ...conditionsData.durationMinutes,
        unit: "minutes",
      });
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
    endTime,
    providerId = null
  ) {
    // Handle provider-specific conditions
    if (this.conditions.providerSpecific && providerId) {
      const providerCondition = this.conditions.providerSpecific[providerId];
      if (providerCondition === false) {
        return 0; // No blocking fee for this provider
      } else if (
        providerCondition &&
        typeof providerCondition.calculateFee === "function"
      ) {
        return providerCondition.calculateFee(
          blockingTimeMinutes,
          chargingTimeMinutes,
          startTime,
          endTime,
          providerId
        );
      }
    }

    // Fallback to legacy calculation
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
          this.conditions.durationHours.getExcessDuration(totalTimeHours) * 60;
      }
    } else if (this.conditions.durationMinutes) {
      const totalTimeMinutes = blockingTimeMinutes;
      if (
        !this.conditions.durationMinutes.isDurationExceeded(
          totalTimeMinutes / 60
        )
      ) {
        applicableMinutes = 0;
      } else {
        applicableMinutes = this.conditions.durationMinutes.getExcessDuration(
          totalTimeMinutes / 60
        );
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

  getBlockingFeeString(conditions = this.conditions) {
    let blockingFeeString = "";
    if (conditions.daytime) {
      const perTimeRangeString = conditions.daytime.timeRanges
        .map((timeRange) => {
          const { from, to, pricePerMin, maxPrice, maxBilledMinutes } =
            timeRange;

          const differentPrice = pricePerMin !== this.pricePerMin;

          const fromString = from
            .split(":")
            .filter((part) => part !== "00")
            .join(":");

          const toString = to
            .split(":")
            .filter((part) => part !== "00")
            .join(":");

          if (differentPrice || maxPrice || maxBilledMinutes) {
            return [
              to < from ? "🌙" : "☀️",
              `🕙${fromString}-${toString}h: `,
              [
                differentPrice &&
                  `${pricePerMin.toFixed(
                    2
                  )}<span class='price-unit'>€/min</span>`,
                maxPrice &&
                  `max ${maxPrice.toFixed(2)}<span class='price-unit'>€</span>`,
                maxBilledMinutes &&
                  `max ${maxBilledMinutes}<span class='price-unit'>min</span>`,
              ]
                .filter((string) => string)
                .join(", "),
            ].join("");
          }
        })
        .filter((string) => string)
        .join("<br/>");

      blockingFeeString =
        this.pricePerMin.toFixed(2) +
        "<span class='price-unit'>€/min</span><br/><small><i style='font-weight: normal;'>" +
        perTimeRangeString +
        "</i></small>";
    } else if (conditions.durationHours) {
      const details = conditions.durationHours;
      blockingFeeString =
        "<small><i style='font-weight: normal;'>" +
        "⏳>" +
        details.from +
        "h: " +
        this.pricePerMin.toFixed(2) +
        "<span class='price-unit'>€/min</span><br/>max " +
        details.maxPrice.toFixed(2) +
        "<span class='price-unit'>€</span></i></small>";
    } else if (conditions.providerSpecific) {
      const freeProviders = [];
      const paidProviders = [];
      Object.entries(conditions.providerSpecific).forEach(
        ([provider, data]) => {
          if (data) {
            paidProviders.push(
              `<div><span class="provider-tag">${provider}</span>: ${new BlockingFee(
                data
              ).getBlockingFeeString()}</div>`
            );
          } else {
            freeProviders.push(`<span class="provider-tag">${provider}</span>`);
          }
        }
      );
      const paidProvidersString =
        paidProviders.length > 0
          ? `<div class="paid-providers">${paidProviders.join("")}</div>`
          : "";
      const freeProvidersString =
        freeProviders.length > 0
          ? `<div class="free-providers">free<br/>${freeProviders.join(
              " "
            )}</div>`
          : "";

      const tootltipString = paidProvidersString + freeProvidersString;
      const tooltip = [
        "<div class='tooltip-container'>" +
          "<i class='tooltip-icon fa-solid fa-info-circle'></i>" +
          "<div class='tooltip-content'>" +
          "<div class='tooltip-content-header'>Providers</div>" +
          tootltipString +
          "</div>" +
          "</div>",
      ].join("");

      const visibleBlockingFeeString =
        "<small><i>Depends on Provider</i></small>";

      blockingFeeString = visibleBlockingFeeString + tooltip;
    } else if (this.pricePerMin) {
      blockingFeeString =
        this.pricePerMin.toFixed(2) + "<span class='price-unit'>€/min</span>";
    } else {
      blockingFeeString = this.description + " " + JSON.stringify(conditions);
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
    endTime,
    providerId = null
  ) {
    if (!this.blockingFee) return 0;
    else if (typeof this.blockingFee === "object") {
      return this.blockingFee.calculateFee(
        blockingTimeMinutes,
        chargingTimeMinutes,
        startTime,
        endTime,
        providerId
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
    endTime,
    providerId = null
  ) {
    const energyCost = this.calculateEnergyCost(energyKwh);
    // const timeCost = chargingTimeMinutes * this.pricePerMin;
    const baseFee = this.getBaseFee();

    let blockingFee = this.calculateBlockingFee(
      blockingTimeMinutes,
      chargingTimeMinutes,
      startTime,
      endTime,
      providerId
    );

    return energyCost + baseFee + blockingFee;
  }

  calculateEnergyCost(energyKwh) {
    return energyKwh * this.pricePerKwh;
  }

  /**
   * Get effective price per kWh including all fees
   */
  getEffectivePricePerKwh(
    energyKwh,
    chargingTimeMinutes,
    blockingTimeMinutes = 0,
    startTime,
    endTime,
    providerId = null
  ) {
    const totalCost = this.calculateTotalCost(
      energyKwh,
      chargingTimeMinutes,
      blockingTimeMinutes,
      startTime,
      endTime,
      providerId
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
        // TODO: implement AC and DC tariffs
        // Determine tariff type based on data (e.g. AC and DC)
        // if (tariffData.types && Array.isArray(tariffData.types)) {
        //   // Handle tariffs with multiple types
        //   return tariffData.types.map((type) => {
        //     const tariffDataWithType = { ...tariffData, type };
        //     return this.createTariffInstance(tariffDataWithType);
        //   });
        // } else {
        return this.createTariffInstance(tariffData);
        // }
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
    endTime,
    providerId = null
  ) {
    return tariffs
      .map((tariff) => ({
        tariff,
        name: tariff.name,
        providerName: tariff.providerName,
        pricePerKwh: tariff.pricePerKwh,
        baseFee: tariff.getBaseFee(),
        totalCost: tariff.calculateTotalCost(
          energyKwh,
          chargingTimeMinutes,
          blockingTimeMinutes,
          startTime,
          endTime,
          providerId
        ),
        blockingFee: tariff.calculateBlockingFee(
          blockingTimeMinutes,
          chargingTimeMinutes,
          startTime,
          endTime,
          providerId
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
          endTime,
          providerId
        ),
        energyCost: tariff.calculateEnergyCost(energyKwh),
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

export {
  ConnectorType,
  ChargingType,
  TimeRange,
  BlockingFeeCondition,
  TimeBasedCondition,
  DurationBasedCondition,
  ProviderBasedCondition,
  BlockingFee,
  SpecialAttributes,
  BaseTariff,
  ACTariff,
  DCTariff,
  Provider,
  TariffManager,
};
export default TariffManager;
