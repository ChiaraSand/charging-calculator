/**
 * Example test file to demonstrate test structure
 * This file can be removed once you're familiar with the test setup
 */

import { mockVehicleData } from "mocks/testData.js";

describe("Example Test Suite", () => {
  test("should demonstrate basic test structure", () => {
    // Arrange
    const input = "Hello, World!";
    const expected = "HELLO, WORLD!";

    // Act
    const result = input.toUpperCase();

    // Assert
    expect(result).toBe(expected);
  });

  test("should demonstrate async testing", async () => {
    // Arrange
    const promise = Promise.resolve("async result");

    // Act
    const result = await promise;

    // Assert
    expect(result).toBe("async result");
  });

  test("should demonstrate mock usage", () => {
    // Arrange
    const mockFunction = jest.fn().mockReturnValue("mocked value");

    // Act
    const result = mockFunction("test input");

    // Assert
    expect(result).toBe("mocked value");
    expect(mockFunction).toHaveBeenCalledWith("test input");
    expect(mockFunction).toHaveBeenCalledTimes(1);
  });

  test("should demonstrate DOM mocking", () => {
    // Arrange
    const mockElement = {
      id: "test-element",
      value: "test value",
      textContent: "",
      addEventListener: jest.fn(),
    };

    document.getElementById = jest.fn().mockReturnValue(mockElement);

    // Act
    const element = document.getElementById("test-element");
    element.textContent = "Updated content";

    // Assert
    expect(element.id).toBe("test-element");
    expect(element.textContent).toBe("Updated content");
    expect(document.getElementById).toHaveBeenCalledWith("test-element");
  });

  test("should demonstrate test data usage", () => {
    // Arrange
    const vehicleId = "renault-5-e-tech-52kwh";
    const vehicle = mockVehicleData[vehicleId];

    // Act & Assert
    expect(vehicle).toBeDefined();
    expect(vehicle.name).toBe("Renault 5 E-Tech 52 kWh");
    expect(vehicle.batteryCapacity).toBe(52);
    expect(vehicle.maxChargingPower).toBe(100);
  });

  describe("Nested test group", () => {
    test("should demonstrate nested test structure", () => {
      expect(true).toBe(true);
    });

    test("should demonstrate beforeEach usage", () => {
      // This would be set up in beforeEach in a real test
      const testData = { value: 42 };

      expect(testData.value).toBe(42);
    });
  });
});
