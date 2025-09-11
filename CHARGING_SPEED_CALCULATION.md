# Charging Speed Calculation

This document explains how the charging speed calculation works in the E-Auto Ladekosten Rechner, using real-world vehicle charging curves.

## Overview

The calculator now uses vehicle-specific charging curves to provide more accurate charging time estimates. Instead of assuming constant charging power, it accounts for the actual charging behavior of electric vehicles, which varies significantly based on battery state of charge (SoC).

## Key Features

### 1. Vehicle-Specific Charging Curves

The system includes real charging data from actual vehicles:

- **Renault 5 E-Tech 52 kWh**: Complete charging curve data from 14% to 97% SoC
- **Generic Vehicle**: Fallback calculation for unknown vehicles

### 2. Real-World Data Integration

The Renault 5 E-Tech data includes:

- Charging speeds at different battery levels
- Power reduction as battery fills up
- Realistic charging behavior patterns

### 3. Dynamic Power Calculation

Instead of using a fixed charging power, the system:

- Calculates actual charging power at each battery level
- Accounts for power tapering at higher SoC levels
- Provides realistic time estimates

## How It Works

### 1. Data Structure

```javascript
// Example charging curve data (400kW charger)
"400": {
  "14": 100.39,  // 14% SoC = 100.39 kW
  "15": 100.56,  // 15% SoC = 100.56 kW
  "20": 100.89,  // 20% SoC = 100.89 kW
  "50": 75.86,   // 50% SoC = 75.86 kW
  "80": 41.85,   // 80% SoC = 41.85 kW
  "95": 18.64,   // 95% SoC = 18.64 kW
  // ... more data points
}
```

### 2. Calculation Process

1. **Input Parameters**:

   - Current battery level (e.g., 20%)
   - Target battery level (e.g., 80%)
   - Available charger power (e.g., 150 kW)
   - Battery capacity (e.g., 52 kWh)

2. **Power Lookup**:

   - Find the closest charger power curve
   - Look up charging power for each battery level
   - Interpolate between data points if needed

3. **Time Calculation**:
   - Calculate energy needed for each 1% increment
   - Determine time required based on actual charging power
   - Sum up total charging time

### 3. Example Calculation

For a Renault 5 E-Tech charging from 20% to 80% on a 150kW charger:

```
Battery Level | Charging Power | Energy for 1% | Time for 1%
20%          | 100.89 kW      | 0.52 kWh      | 0.31 min
30%          | 96.05 kW       | 0.52 kWh      | 0.32 min
50%          | 75.86 kW       | 0.52 kWh      | 0.41 min
70%          | 59.69 kW       | 0.52 kWh      | 0.52 min
80%          | 41.85 kW       | 0.52 kWh      | 0.75 min
```

**Total Time**: ~25 minutes (vs. 20 minutes with constant power)

## Benefits

### 1. Accuracy

- Real-world charging behavior
- Accounts for power tapering
- More precise time estimates

### 2. User Experience

- Vehicle-specific calculations
- Visual charging speed information
- Realistic charging curves in charts

### 3. Cost Calculation

- More accurate energy consumption
- Better cost estimates
- Realistic charging scenarios

## Technical Implementation

### VehicleChargingCurves Class

```javascript
class VehicleChargingCurves {
  // Get charging power for specific battery level
  getChargingPower(vehicleId, batteryLevel, chargerPower)

  // Calculate total charging time
  calculateChargingTime(vehicleId, currentLevel, targetLevel, chargerPower, batteryCapacity)

  // Add new vehicle data
  addVehicle(vehicleId, vehicleData)
}
```

### Integration with Calculator

```javascript
// Use vehicle-specific curves
const chargingResult = this.vehicleCurves.calculateChargingTime(
  this.selectedVehicle,
  currentCharge,
  targetCharge,
  chargingPower,
  batteryCapacity
);
```

## Adding New Vehicles

To add a new vehicle with charging curve data:

```javascript
const newVehicleData = {
  name: "Tesla Model 3 Long Range",
  batteryCapacity: 75,
  maxChargingPower: 250,
  connectorType: "CCS",
  chargingCurves: {
    250: {
      10: 250.0,
      20: 250.0,
      50: 200.0,
      80: 100.0,
      90: 50.0,
    },
  },
};

vehicleCurves.addVehicle("tesla-model-3-lr", newVehicleData);
```

## Data Sources

The charging curve data comes from:

- Real-world testing
- Manufacturer specifications
- Public charging data
- User contributions

## Future Enhancements

1. **More Vehicles**: Add charging curves for popular EV models
2. **Temperature Effects**: Account for temperature impact on charging
3. **Battery Degradation**: Consider battery aging effects
4. **Dynamic Updates**: Real-time charging curve updates
5. **User Data**: Allow users to contribute their own charging data

## Usage

1. Select your vehicle from the dropdown
2. Enter charging parameters
3. View realistic charging time estimates
4. See charging speed information
5. Compare with linear estimates

The system automatically uses the most appropriate charging curve for your selected vehicle and charging scenario.
