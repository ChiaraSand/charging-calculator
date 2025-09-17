/**
 * Tests for Tariff Classes (BaseTariff, ACTariff, DCTariff, etc.)
 */

import DateTimeHelper from "../../pages/calculator/services/DateTimeHelper.js";
import {
  BlockingFee,
  SpecialAttributes,
  BaseTariff,
  ACTariff,
  DCTariff,
  Provider,
  TariffManager,
} from "../../pages/calculator/services/TariffClasses.js";
import { mockTariffData } from "../mocks/testData.js";

describe("Tariff Classes", () => {
  describe("BaseTariff", () => {
    let tariff;

    beforeEach(() => {
      tariff = new BaseTariff(mockTariffData[0]);
    });

    test("should create tariff with correct properties", () => {
      expect(tariff.id).toBe("aral-pulse-adac");
      expect(tariff.name).toBe("Aral Pulse (ADAC)");
      expect(tariff.type).toBe("AC");
      expect(tariff.pricePerKwh).toBe(0.57);
      expect(tariff.connectors).toEqual(["TYPE_2"]);
    });

    test("should calculate energy cost correctly", () => {
      expect(tariff.calculateEnergyCost(10)).toBeCloseTo(5.7, 1);
      expect(tariff.calculateEnergyCost(0)).toBeCloseTo(0, 1);
    });

    test("should calculate total cost without blocking fee", () => {
      const totalCost = tariff.calculateTotalCost(10, 60, 0, "10:00", "11:00");
      expect(totalCost).toBeCloseTo(5.7, 1); // 10 kWh * 0.57 €/kWh
    });

    test("should calculate effective price per kWh", () => {
      const effectivePrice = tariff.getEffectivePricePerKwh(
        10,
        60,
        0,
        "10:00",
        "11:00"
      );
      expect(effectivePrice).toBe(0.57);
    });

    test("should check connector compatibility", () => {
      expect(tariff.isCompatibleWithConnectors(["TYPE_2"])).toBe(true);
      expect(tariff.isCompatibleWithConnectors(["CCS_2"])).toBe(false);
      expect(tariff.isCompatibleWithConnectors(["TYPE_2", "CCS_2"])).toBe(true);
    });

    test("should return base fee correctly", () => {
      expect(tariff.getBaseFee()).toBe(0);

      const tariffWithBaseFee = new BaseTariff({
        ...mockTariffData[0],
        baseFee: 2.5,
      });
      expect(tariffWithBaseFee.getBaseFee()).toBe(2.5);
    });
  });

  describe("ACTariff", () => {
    let acTariff;

    beforeEach(() => {
      acTariff = new ACTariff(mockTariffData[0]);
    });

    test("should have AC type", () => {
      expect(acTariff.type).toBe("AC");
    });

    test("should have default max power", () => {
      expect(acTariff.maxPowerKw).toBe(22);
    });

    test("should allow custom max power", () => {
      const customACTariff = new ACTariff({
        ...mockTariffData[0],
        maxPowerKw: 11,
      });
      expect(customACTariff.maxPowerKw).toBe(11);
    });
  });

  describe("DCTariff", () => {
    let dcTariff;

    beforeEach(() => {
      dcTariff = new DCTariff(mockTariffData[2]);
    });

    test("should have DC type", () => {
      expect(dcTariff.type).toBe("DC");
    });

    test("should have default max power", () => {
      expect(dcTariff.maxPowerKw).toBe(150);
    });

    test("should allow custom max power", () => {
      const customDCTariff = new DCTariff({
        ...mockTariffData[2],
        maxPowerKw: 300,
      });
      expect(customDCTariff.maxPowerKw).toBe(300);
    });
  });

  describe("BlockingFee", () => {
    let blockingFee;

    test("should create simple blocking fee", () => {
      blockingFee = new BlockingFee({ pricePerMin: 0.1 });
      expect(blockingFee.pricePerMin).toBe(0.1);
      expect(blockingFee.calculateFee(60, 0, "10:00", "11:00")).toBe(6.0);
    });

    test("should create time-based blocking fee", () => {
      blockingFee = new BlockingFee({
        pricePerMin: 0.02,
        conditions: {
          daytime: {
            from: "21:00",
            to: "07:00",
            maxPrice: 2.0,
            maxBilledMinutes: 60,
          },
        },
      });
      expect(blockingFee.pricePerMin).toBe(0.02);
    });

    test("should calculate fee with time conditions", () => {
      blockingFee = new BlockingFee({
        pricePerMin: 0.02,
        conditions: {
          daytime: {
            from: "21:00",
            to: "07:00",
            maxPrice: 2.0,
            maxBilledMinutes: 60,
          },
        },
      });

      // Test during night hours
      const nightFee = blockingFee.calculateFee(120, 0, "22:00", "00:00");
      expect(nightFee).toBeLessThanOrEqual(2.0);
    });

    test("should return correct blocking fee string", () => {
      blockingFee = new BlockingFee({
        pricePerMin: 0.02,
        conditions: {
          daytime: {
            from: "21:00",
            to: "07:00",
            maxPrice: 2.0,
            maxBilledMinutes: 60,
          },
        },
      });

      const feeString = blockingFee.getBlockingFeeString();
      expect(feeString).toContain("0.02");
      expect(feeString).toContain("€/min");
      expect(feeString).toContain("21-07h");
    });
  });

  describe("SpecialAttributes", () => {
    let specialAttrs;

    test("should create with default values", () => {
      specialAttrs = new SpecialAttributes();
      expect(specialAttrs.plugAndCharge).toBe(false);
      expect(specialAttrs.registrationRequired).toBe(false);
      expect(specialAttrs.membershipRequired).toBe(false);
    });

    test("should create with custom values", () => {
      specialAttrs = new SpecialAttributes({
        plugAndCharge: true,
        registrationRequired: true,
        membershipRequired: false,
      });
      expect(specialAttrs.plugAndCharge).toBe(true);
      expect(specialAttrs.registrationRequired).toBe(true);
      expect(specialAttrs.membershipRequired).toBe(false);
    });
  });

  describe("Provider", () => {
    let provider;

    beforeEach(() => {
      provider = new Provider({
        id: "test-provider",
        name: "Test Provider",
        type: "AC",
        connectors: ["TYPE_2"],
        tariffs: [mockTariffData[0]],
      });
    });

    test("should create provider with tariffs", () => {
      expect(provider.id).toBe("test-provider");
      expect(provider.name).toBe("Test Provider");
      expect(provider.tariffs).toHaveLength(1);
      expect(provider.tariffs[0]).toBeInstanceOf(BaseTariff);
    });

    test("should filter tariffs by type", () => {
      const acTariffs = provider.getTariffsByType("AC");
      expect(acTariffs).toHaveLength(1);

      const dcTariffs = provider.getTariffsByType("DC");
      expect(dcTariffs).toHaveLength(0);
    });

    test("should get compatible tariffs", () => {
      const compatibleTariffs = provider.getCompatibleTariffs(["TYPE_2"]);
      expect(compatibleTariffs).toHaveLength(1);

      const incompatibleTariffs = provider.getCompatibleTariffs(["CCS_2"]);
      expect(incompatibleTariffs).toHaveLength(0);
    });
  });

  describe("Real-life Qwello Tariff Tests", () => {
    let qwelloTariff;
    // NOTE: All of them use the tariff active at 2025-09-15 (49ct/kWh + 0.02€/min blocking fee (with night cap))
    let expectedResults = [
      {
        description: "2025-08-05",
        startTime: "17:24",
        endTime: "09:53",
        energyKwh: 33.18,
        expectedBlockingTimeMinutes: 989 - 1,
        expectedEnergyCost: 16.25,
        expectedBlockingFee: 11.36,
        expectedTotalCost: 27.61,
      },
      {
        description: "2025-07-22",
        startTime: "16:57",
        endTime: "20:51",
        energyKwh: 42.08,
        // 3h 54m - 1min, NOTE: 3h 53min in qwello app (this one actually matches calculated fee)
        expectedBlockingTimeMinutes: 234 - 1,
        expectedEnergyCost: 20.61,
        expectedBlockingFee: 4.66,
        expectedTotalCost: 25.27,
      },
      {
        description: "2025-07-14",
        startTime: "19:23",
        endTime: "14:08",
        energyKwh: 55.64,
        expectedBlockingTimeMinutes: 1125 - 1, // 18h 45m - 1min, NOTE: 18h 43min in qwello app
        expectedEnergyCost: 27.26,
        expectedBlockingFee: 14.08,
        expectedTotalCost: 41.34,
      },
      {
        description: "2025-07-08",
        startTime: "17:18",
        endTime: "09:47",
        energyKwh: 60.19,
        expectedBlockingTimeMinutes: 989 - 1, // 16h 29m - 1min, NOTE: 16h 27min in qwello app
        expectedEnergyCost: 29.49,
        expectedBlockingFee: 11.36,
        expectedTotalCost: 40.85,
      },
      {
        description: "2025-07-01",
        startTime: "17:07",
        endTime: "10:13",
        energyKwh: 39.08,
        expectedBlockingTimeMinutes: 1026 - 1, // 17h 6m - 1min, NOTE: 17h 4min in qwello app
        expectedEnergyCost: 19.14,
        expectedBlockingFee: 12.1,
        expectedTotalCost: 31.24,
      },
    ];

    beforeEach(() => {
      // Create Qwello tariff from mock data
      qwelloTariff = new ACTariff(
        mockTariffData.find((t) => t.id === "qwello-nrw")
      ); // Qwello NRW is at index 1
    });

    test.each(expectedResults)(
      "should calculate correct costs for scenario $startTime-$endTime, $energyKwh kWh",
      ({
        startTime,
        endTime,
        energyKwh,
        expectedBlockingTimeMinutes,
        expectedEnergyCost,
        expectedBlockingFee,
        expectedTotalCost,
      }) => {
        const chargingTimeMinutes = DateTimeHelper.calculateTimeDifference(
          startTime,
          endTime
        );
        // NOTE:
        // `-1` because qwello does not bill incomplete minutes and seems to round start up and end down
        // 17:00-17:05
        // - lowest edge case: 17:00:59-17:05:00 = 4:01 minutes
        // - highest edge case: 17:00:00-17:05:59 = 5:59 minutes
        // => 17:01-17:05 = 4 minutes
        // WARNING: Qwello App MAY show `-2` minutes (3 mins) but still calculates with `-1` min (4 mins)!
        const blockingTimeMinutes = chargingTimeMinutes - 1;

        // Calculate actual costs
        const actualTotalCostCalculated = qwelloTariff.calculateTotalCost(
          energyKwh,
          chargingTimeMinutes,
          blockingTimeMinutes,
          startTime,
          endTime
        );
        // Cut to 2 decimal places like qwello
        const actualTotalCost =
          Math.floor(actualTotalCostCalculated * 100) / 100;

        const actualBlockingFee = qwelloTariff.calculateBlockingFee(
          blockingTimeMinutes,
          chargingTimeMinutes,
          startTime,
          endTime
        );

        // Cut to 2 decimal places like qwello
        const actualEnergyCost =
          Math.floor(qwelloTariff.calculateEnergyCost(energyKwh) * 100) / 100;

        expect(blockingTimeMinutes).toBe(expectedBlockingTimeMinutes);

        // Verify energy cost (should be exact)
        expect(actualEnergyCost).toBe(expectedEnergyCost);

        // Verify blocking fee (should be in reasonable range - real-life calculation may differ)
        expect(actualBlockingFee).toBe(expectedBlockingFee);

        // Verify total cost (energy cost should be exact, blocking fee may vary)
        expect(actualTotalCost).toBe(expectedTotalCost);
      }
    );

    test("should handle Qwello blocking fee time conditions correctly", () => {
      // Test the specific Qwello blocking fee conditions: 21:00-07:00, max 3.6€, max 180 min
      expect(qwelloTariff.blockingFee.pricePerMin).toBe(0.02);
      expect(qwelloTariff.blockingFee.conditions.daytime.from).toBe("21:00");
      expect(qwelloTariff.blockingFee.conditions.daytime.to).toBe("07:00");
      expect(qwelloTariff.blockingFee.conditions.daytime.maxPrice).toBe(3.6);
      expect(qwelloTariff.blockingFee.conditions.daytime.maxBilledMinutes).toBe(
        180
      );
    });
  });

  describe("Aral Pulse Tariff Tests", () => {
    let aralPulseTariff;
    // NOTE: These use different tariff because the price changed at 2025-08-??
    // from (57ct/kWh + 0€ blocking fee)
    // to (55ct/kWh + 0€ blocking fee)
    // FIXME: Use startTime 00:00 and endTime=blockingTime ? daytime is not used for pulse
    let expectedResults = [
      {
        description: "2025-09-10 (55ct/kWh)",
        startTime: "11:08",
        endTime: "11:04", // NOTE: Calculated with blocking time because Pulse only shows blocking time
        expectedBlockingTimeMinutes: 36.383, // 00:36:23
        energyKwh: 35.877,
        expectedEnergyCost: 19.73,
        expectedBlockingFee: 0.0,
        expectedTotalCost: 19.73,
      },
      {
        description: "2025-07-23 (57ct/kWh)",
        startTime: "10:27",
        endTime: "10:59", // NOTE: Calculated with blocking time because Pulse only shows blocking time
        expectedBlockingTimeMinutes: 32.266, // 00:32:16
        energyKwh: 37.451,
        expectedEnergyCost: 21.35,
        expectedBlockingFee: 0.0,
        expectedTotalCost: 21.35,
      },
    ];
  });

  describe("TariffManager", () => {
    let tariffManager;

    beforeEach(() => {
      tariffManager = new TariffManager();
      // Convert mock data to the format expected by TariffManager
      const providerData = mockTariffData.map((tariff) => ({
        id: tariff.id,
        name: tariff.name,
        type: tariff.type,
        connectors: tariff.connectors,
        tariffs: [tariff],
      }));
      tariffManager.loadFromJson(providerData);
    });

    test("should load tariffs from JSON data", () => {
      expect(tariffManager.tariffs).toHaveLength(4);
      expect(tariffManager.providers).toHaveLength(4);
    });

    test("should filter tariffs by providers", () => {
      const filteredTariffs = tariffManager.getFilteredTariffs({
        providers: ["Aral Pulse (ADAC)"],
      });
      expect(filteredTariffs).toHaveLength(1);
      expect(filteredTariffs[0].providerName).toBe("Aral Pulse (ADAC)");
    });

    test("should filter tariffs by connectors", () => {
      const filteredTariffs = tariffManager.getFilteredTariffs({
        connectors: ["TYPE_2"],
      });
      expect(filteredTariffs).toHaveLength(2); // Aral Pulse and Qwello
    });

    test("should filter tariffs by type", () => {
      const acTariffs = tariffManager.getFilteredTariffs({ types: ["AC"] });
      expect(acTariffs).toHaveLength(2);

      const dcTariffs = tariffManager.getFilteredTariffs({ types: ["DC"] });
      expect(dcTariffs).toHaveLength(2);
    });

    test("should sort tariffs by cost", () => {
      const sortedTariffs = tariffManager.sortByCost(
        tariffManager.tariffs,
        10, // 10 kWh
        60, // 60 minutes
        0, // no blocking time
        "10:00",
        "11:00"
      );

      expect(sortedTariffs).toHaveLength(4);
      // Should be sorted by total cost (ascending)
      for (let i = 1; i < sortedTariffs.length; i++) {
        expect(sortedTariffs[i - 1].totalCost).toBeLessThanOrEqual(
          sortedTariffs[i].totalCost
        );
      }
    });

    test("should get unique providers", () => {
      const uniqueProviders = tariffManager.getUniqueProviders();
      expect(uniqueProviders).toContain("Aral Pulse (ADAC)");
      expect(uniqueProviders).toContain("Qwello NRW");
      expect(uniqueProviders).toContain("Mobility+ Fremd");
      expect(uniqueProviders).toContain("Ionity");
    });

    test("should get unique connectors", () => {
      const uniqueConnectors = tariffManager.getUniqueConnectors();
      expect(uniqueConnectors).toContain("TYPE_2");
      expect(uniqueConnectors).toContain("CCS_2");
      expect(uniqueConnectors).toContain("CHAdeMO");
    });
  });
});
