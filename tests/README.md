# Charging Calculator Test Suite

This directory contains comprehensive tests for the Charging Calculator application.

## 📁 Test Structure

```ini
tests/
├── README.md                    # This file
├── setup.js                     # Jest setup and global mocks
├── run-tests.js                 # Test runner script
├── mocks/
│   ├── testData.js             # Mock data and test fixtures
│   └── secrets.json             # Secrets for tests (e.g. google maps api key)
└── suits/
    ├── DateTimeHelper.test.js       # Tests for DateTimeHelper class
    ├── TariffClasses.test.js        # Tests for tariff-related classes
    ├── VehicleChargingCurves.test.js # Tests for vehicle charging calculations
    ├── ChartManager.test.js         # Tests for chart functionality
    ├── GoogleMapsManager.test.js    # Tests for maps integration
    └── ChargingCalculator.test.js   # Integration tests for main class
```

## 🧪 Test Coverage

The test suite covers:

### Core Classes

- **DateTimeHelper**: Time calculations, formatting, and conversions
- **TariffClasses**: All tariff-related classes (BaseTariff, ACTariff, DCTariff, etc.)
- **VehicleChargingCurves**: Vehicle-specific charging calculations
- **ChartManager**: Chart initialization and data updates
- **GoogleMapsManager**: Maps integration and charging station handling
- **ChargingCalculator**: Main application integration

### Test Categories

- **Unit Tests**: Individual class and method testing
- **Integration Tests**: Component interaction testing
- **Edge Cases**: Boundary conditions and error handling
- **Mock Testing**: External dependencies (Google Maps, Chart.js, etc.)

## 🚀 Running Tests

### Prerequisites

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npx jest tests/suits/DateTimeHelper.test.js
```

### Run Test Suite Script

```bash
node tests/run-tests.js
```

## 📊 Coverage Reports

After running tests with coverage, you can view detailed reports:

- **Terminal**: Coverage summary displayed in console
- **HTML Report**: Open `./coverage/lcov-report/index.html` in your browser
- **LCOV Report**: Available at `./coverage/lcov.info`

## 🔧 Test Configuration

### Jest Configuration

Tests are configured in `package.json`:

- **Environment**: jsdom (browser-like environment)
- **Setup**: `tests/setup.js` runs before each test
- **Coverage**: Collects coverage from `pages/calculator/**/*.js`
- **Pattern**: Tests match `**/tests/**/*.test.js`

### Mock Setup

The `setup.js` file provides mocks for:

- **Chart.js**: Chart creation and updates
- **Google Maps API**: Maps, markers, and geolocation
- **DOM APIs**: Document methods and element creation
- **Fetch API**: JSON data loading
- **localStorage**: Data persistence
- **Console**: Reduced noise in test output

## 📝 Writing Tests

### Test File Structure

```javascript
describe("ClassName", () => {
  let instance;

  beforeEach(() => {
    instance = new ClassName();
  });

  describe("methodName", () => {
    test("should do something specific", () => {
      // Arrange
      const input = "test input";

      // Act
      const result = instance.methodName(input);

      // Assert
      expect(result).toBe("expected output");
    });
  });
});
```

### Mock Data Usage

Use the provided mock data from `mocks/testData.js`:

```javascript
import { mockTariffData, mockVehicleData } from "./mocks/testData.js";
```

### DOM Element Mocking

Use the helper function for consistent DOM element mocking:

```javascript
const mockElement = createMockElement("elementId", { value: "test" });
document.getElementById.mockReturnValue(mockElement);
```

## 🐛 Debugging Tests

### Verbose Output

```bash
npx jest --verbose
```

### Debug Specific Test

```bash
npx jest --testNamePattern="should calculate charging time"
```

### Run Tests in Node.js Debugger

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📈 Test Metrics

The test suite aims for:

- **Coverage**: >90% code coverage
- **Performance**: All tests complete in <30 seconds
- **Reliability**: Tests should be deterministic and repeatable
- **Maintainability**: Clear test structure and documentation

## 🔄 Continuous Integration

Tests are designed to run in CI environments:

- No external dependencies (all APIs mocked)
- Deterministic results
- Clear pass/fail indicators
- Coverage reporting

## 📚 Best Practices

### Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Keep tests independent and isolated

### Mock Management

- Mock external dependencies
- Use realistic test data
- Reset mocks between tests
- Verify mock interactions when relevant

### Error Testing

- Test error conditions
- Verify error messages
- Test edge cases and boundary conditions
- Ensure graceful degradation

## 🤝 Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update this README if needed

When fixing bugs:

1. Write a test that reproduces the bug
2. Fix the bug
3. Verify the test passes
4. Ensure no regressions

## 📞 Support

For test-related questions or issues:

1. Check existing test files for examples
2. Review Jest documentation
3. Check mock setup in `setup.js`
4. Verify test data in `mocks/testData.js`
