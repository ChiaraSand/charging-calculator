# Testing Documentation

This document provides an overview of the comprehensive test suite created for the Charging Calculator application.

## 🎯 Overview

A complete test suite has been generated for the Charging Calculator project, covering all major components and functionality. The tests are designed to ensure code quality, catch regressions, and provide confidence when making changes.

## 📁 Test Structure

```
tests/
├── README.md                    # Detailed testing documentation
├── setup.js                     # Jest setup and global mocks
├── run-tests.js                 # Test runner script
├── example.test.js              # Example test file (can be removed)
├── mocks/
│   └── testData.js             # Mock data and test fixtures
├── DateTimeHelper.test.js       # Tests for DateTimeHelper class
├── TariffClasses.test.js        # Tests for tariff-related classes
├── VehicleChargingCurves.test.js # Tests for vehicle charging calculations
├── ChartManager.test.js         # Tests for chart functionality
├── GoogleMapsManager.test.js    # Tests for maps integration
└── ChargingCalculator.test.js   # Integration tests for main class
```

## 🧪 Test Coverage

### Core Classes Tested

- **DateTimeHelper**: Time calculations, formatting, and conversions
- **TariffClasses**: All tariff-related classes (BaseTariff, ACTariff, DCTariff, BlockingFee, etc.)
- **VehicleChargingCurves**: Vehicle-specific charging calculations and curve interpolation
- **ChartManager**: Chart initialization, data updates, and legend controls
- **GoogleMapsManager**: Maps integration, charging station handling, and geolocation
- **ChargingCalculator**: Main application integration and user interactions

### Test Types

- **Unit Tests**: Individual class and method testing
- **Integration Tests**: Component interaction testing
- **Edge Cases**: Boundary conditions and error handling
- **Mock Testing**: External dependencies (Google Maps, Chart.js, DOM APIs)

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx jest tests/DateTimeHelper.test.js

# Run test suite script
node tests/run-tests.js
```

## 📊 Key Features

### Comprehensive Mocking

- **Chart.js**: Complete chart functionality mocking
- **Google Maps API**: Maps, markers, geolocation, and Places API
- **DOM APIs**: Document methods, element creation, and event handling
- **Fetch API**: JSON data loading and error handling
- **localStorage**: Data persistence and retrieval
- **Console**: Reduced noise in test output

### Realistic Test Data

- **Vehicle Data**: Charging curves for different vehicles
- **Tariff Data**: Realistic charging tariffs and pricing
- **Connector Data**: Charging connector types and compatibility
- **Presets**: User configuration presets
- **Charging Stations**: Mock charging station data

### Test Scenarios

- **Valid Inputs**: Normal operation with realistic data
- **Invalid Inputs**: Error handling and edge cases
- **Empty States**: Graceful handling of missing data
- **Integration**: Component interaction and data flow
- **User Interactions**: Form inputs, filtering, and calculations

## 🔧 Configuration

### Jest Setup

- **Environment**: jsdom (browser-like environment)
- **Setup File**: `tests/setup.js` runs before each test
- **Coverage**: Collects from `pages/calculator/**/*.js`
- **Pattern**: Tests match `**/tests/**/*.test.js`

### Package.json Scripts

```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:ci": "jest --ci --coverage --watchAll=false"
}
```

## 📈 Test Metrics

The test suite provides:

- **High Coverage**: >90% code coverage target
- **Fast Execution**: All tests complete in <30 seconds
- **Reliable Results**: Deterministic and repeatable
- **Clear Output**: Verbose reporting and error messages
- **CI Ready**: Designed for continuous integration

## 🎨 Test Examples

### Unit Test Example

```javascript
test("should calculate time difference correctly", () => {
  expect(DateTimeHelper.calculateTimeDifference("10:00", "12:00")).toBe(120);
  expect(DateTimeHelper.calculateTimeDifference("23:00", "01:00")).toBe(120);
});
```

### Integration Test Example

```javascript
test("should handle complete charging scenario", () => {
  // Set up realistic charging scenario
  mockElements.batteryCapacity.value = "52";
  mockElements.currentCharge.value = "20";
  mockElements.targetCharge.value = "80";

  calculator.updateCalculations();
  calculator.populateTariffTable();

  expect(mockElements.energyToCharge.textContent).toContain("kWh");
});
```

### Mock Test Example

```javascript
test("should create chart with correct configuration", () => {
  const mockCanvas = createMockElement("chargingLevelChart");
  document.getElementById.mockReturnValue(mockCanvas);

  chartManager.initializeChargingChart();

  expect(Chart).toHaveBeenCalled();
  expect(chartManager.chargingChart).toBeDefined();
});
```

## 🔄 Continuous Integration

### GitHub Actions

- **Automated Testing**: Runs on push and pull requests
- **Multi-Node Testing**: Tests on Node.js 18.x and 20.x
- **Coverage Reporting**: Uploads coverage to Codecov
- **PR Comments**: Shows coverage changes in pull requests

### CI Configuration

```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
```

## 📚 Documentation

### Test Documentation

- **README.md**: Comprehensive testing guide
- **Code Comments**: Inline documentation in test files
- **Examples**: Example test file for reference
- **Best Practices**: Testing guidelines and patterns

### Coverage Reports

- **Terminal**: Coverage summary in console
- **HTML**: Detailed report at `./coverage/lcov-report/index.html`
- **LCOV**: Machine-readable format at `./coverage/lcov.info`

## 🎯 Benefits

### For Development

- **Confidence**: Safe refactoring and feature additions
- **Documentation**: Tests serve as living documentation
- **Debugging**: Quick identification of issues
- **Quality**: Ensures code meets standards

### For Maintenance

- **Regression Prevention**: Catches breaking changes
- **Refactoring Safety**: Validates code changes
- **Performance**: Identifies performance regressions
- **Compatibility**: Ensures cross-browser compatibility

## 🚀 Next Steps

1. **Run Tests**: Execute `npm test` to see the test suite in action
2. **Review Coverage**: Check coverage reports to identify gaps
3. **Add Tests**: Write additional tests for new features
4. **CI Setup**: Configure GitHub Actions for automated testing
5. **Maintain**: Keep tests updated as code evolves

## 📞 Support

For questions about the test suite:

1. Check `tests/README.md` for detailed documentation
2. Review existing test files for examples
3. Consult Jest documentation for advanced features
4. Check mock setup in `tests/setup.js`

The test suite is designed to be comprehensive, maintainable, and easy to understand. It provides a solid foundation for ensuring the quality and reliability of the Charging Calculator application.
