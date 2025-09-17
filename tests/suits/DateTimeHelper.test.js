/**
 * Tests for DateTimeHelper class
 */

import DateTimeHelper from "utils/DateTimeHelper.js";

describe("DateTimeHelper", () => {
  describe("timeToMinutes", () => {
    test("should convert time string to minutes correctly", () => {
      expect(DateTimeHelper.timeToMinutes("00:00")).toBe(0);
      expect(DateTimeHelper.timeToMinutes("01:00")).toBe(60);
      expect(DateTimeHelper.timeToMinutes("12:30")).toBe(750);
      expect(DateTimeHelper.timeToMinutes("23:59")).toBe(1439);
    });

    test("should handle edge cases", () => {
      expect(DateTimeHelper.timeToMinutes("00:01")).toBe(1);
      expect(DateTimeHelper.timeToMinutes("01:01")).toBe(61);
    });
  });

  describe("minutesToTime", () => {
    test("should convert minutes to time string correctly", () => {
      expect(DateTimeHelper.minutesToTime(0)).toBe("00:00");
      expect(DateTimeHelper.minutesToTime(60)).toBe("01:00");
      expect(DateTimeHelper.minutesToTime(750)).toBe("12:30");
      expect(DateTimeHelper.minutesToTime(1439)).toBe("23:59");
    });

    test("should handle edge cases", () => {
      expect(DateTimeHelper.minutesToTime(1)).toBe("00:01");
      expect(DateTimeHelper.minutesToTime(61)).toBe("01:01");
      expect(DateTimeHelper.minutesToTime(1440)).toBe("00:00"); // 24 hours = 0:00 next day
      expect(DateTimeHelper.minutesToTime(1441)).toBe("00:01"); // 24 hours = 0:01 next day
    });
  });

  describe("calculateTimeDifference", () => {
    test("should calculate time difference within same day", () => {
      expect(DateTimeHelper.calculateTimeDifference("10:00", "12:00")).toBe(
        120
      );
      expect(DateTimeHelper.calculateTimeDifference("08:30", "17:45")).toBe(
        555
      );
      expect(DateTimeHelper.calculateTimeDifference("14:15", "14:15")).toBe(0);
    });

    test("should calculate time difference across midnight", () => {
      expect(DateTimeHelper.calculateTimeDifference("23:00", "01:00")).toBe(
        120
      );
      expect(DateTimeHelper.calculateTimeDifference("22:30", "06:30")).toBe(
        480
      );
    });

    test("should handle empty or invalid inputs", () => {
      expect(DateTimeHelper.calculateTimeDifference("", "12:00")).toBe(0);
      expect(DateTimeHelper.calculateTimeDifference("10:00", "")).toBe(0);
      expect(DateTimeHelper.calculateTimeDifference("", "")).toBe(0);
    });
  });

  describe("formatDuration", () => {
    test("should format minutes correctly", () => {
      expect(DateTimeHelper.formatDuration(30)).toBe("30 min");
      expect(DateTimeHelper.formatDuration(59)).toBe("59 min");
      expect(DateTimeHelper.formatDuration(60)).toBe("1:00 h");
      expect(DateTimeHelper.formatDuration(90)).toBe("1:30 h");
      expect(DateTimeHelper.formatDuration(120)).toBe("2:00 h");
    });

    test("should round minutes correctly", () => {
      expect(DateTimeHelper.formatDuration(30.5)).toBe("31 min");
      expect(DateTimeHelper.formatDuration(90.7)).toBe("1:31 h");
    });
  });

  describe("getCurrentTimeString", () => {
    test("should return current time in correct format", () => {
      const timeString = DateTimeHelper.getCurrentTimeString();
      expect(timeString).toMatch(/^\d{2}:\d{2}$/);
    });

    test("should use default locale if none provided", () => {
      const timeString = DateTimeHelper.getCurrentTimeString();
      expect(typeof timeString).toBe("string");
      expect(timeString).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe("addMinutes", () => {
    test("should add minutes correctly within same day", () => {
      expect(DateTimeHelper.addMinutes("10:00", 30)).toBe("10:30");
      expect(DateTimeHelper.addMinutes("10:00", 120)).toBe("12:00");
      expect(DateTimeHelper.addMinutes("23:30", 30)).toBe("00:00");
    });

    test("should handle negative minutes", () => {
      expect(DateTimeHelper.addMinutes("10:00", -30)).toBe("09:30");
      expect(DateTimeHelper.addMinutes("00:30", -60)).toBe("-1:-30");
    });

    test("should handle large minute values", () => {
      expect(DateTimeHelper.addMinutes("10:00", 1440)).toBe("10:00"); // 24 hours
      expect(DateTimeHelper.addMinutes("10:00", 1500)).toBe("11:00"); // 25 hours
    });
  });

  describe("isTimeInRange", () => {
    test("should check if time is within range on same day", () => {
      expect(DateTimeHelper.isTimeInRange("12:00", "10:00", "14:00")).toBe(
        true
      );
      expect(DateTimeHelper.isTimeInRange("09:00", "10:00", "14:00")).toBe(
        false
      );
      expect(DateTimeHelper.isTimeInRange("15:00", "10:00", "14:00")).toBe(
        false
      );
      expect(DateTimeHelper.isTimeInRange("10:00", "10:00", "14:00")).toBe(
        true
      );
      expect(DateTimeHelper.isTimeInRange("14:00", "10:00", "14:00")).toBe(
        true
      );
    });

    test("should check if time is within overnight range", () => {
      expect(DateTimeHelper.isTimeInRange("23:00", "22:00", "06:00")).toBe(
        true
      );
      expect(DateTimeHelper.isTimeInRange("02:00", "22:00", "06:00")).toBe(
        true
      );
      expect(DateTimeHelper.isTimeInRange("12:00", "22:00", "06:00")).toBe(
        false
      );
      expect(DateTimeHelper.isTimeInRange("08:00", "22:00", "06:00")).toBe(
        false
      );
    });

    test("should handle edge cases", () => {
      expect(DateTimeHelper.isTimeInRange("22:00", "22:00", "06:00")).toBe(
        true
      );
      expect(DateTimeHelper.isTimeInRange("06:00", "22:00", "06:00")).toBe(
        true
      );
    });
  });
});
