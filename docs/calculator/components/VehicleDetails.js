class VehicleDetails {
  // constructor() {
  //   this.updateChargingSpeedInfo = this.updateChargingSpeedInfo.bind(this);
  // }

  static calculateProgressbarValue(absoluteValue, maxProgressbarValue) {
    return (absoluteValue / maxProgressbarValue) * 100;
  }

  static calculatePercentageWidth(absoluteValue, minProgressbarValue) {
    const progressbarMinWidthPercentage = 1;
    return Math.max(
      absoluteValue - minProgressbarValue,
      progressbarMinWidthPercentage
    );
  }

  static calculateRangeData(min, max, absoluteMax) {
    const minPercentage = this.calculateProgressbarValue(min, absoluteMax);
    const maxPercentage = this.calculateProgressbarValue(max, absoluteMax);
    const widthPercentage = this.calculatePercentageWidth(
      maxPercentage,
      minPercentage
    );
    const paddingLeftPercentage = minPercentage; //Math.max(percentageMin, 2);
    const paddingRightPercentage = 100 - maxPercentage;
    return {
      min,
      max,
      minPercentage,
      maxPercentage,
      widthPercentage,
      paddingLeftPercentage,
      paddingRightPercentage,
    };
  }

  /**
   * Update charging speed information display (blue box in preconfig section)
   * @param {Object} chargingResult - Result from vehicle charging curves calculation
   * @param {string} selectedVehicle - Selected vehicle ID
   */
  static updateChargingSpeedInfo(
    chargingResult,
    selectedVehicle,
    vehicleCurves,
    chargingType,
    parentElementId = "vehicle-details"
  ) {
    const elementId = `${parentElementId}-chargingSpeedInfo`;
    // Find or create charging speed info element
    let speedInfoElement = document.getElementById(elementId);
    if (!speedInfoElement) {
      speedInfoElement = document.createElement("div");
      speedInfoElement.id = elementId;
      speedInfoElement.className = "charging-speed-info";

      // Insert into the vehicle-details element
      const parentElement = document.getElementById(parentElementId);
      if (!parentElement) {
        console.error("Parent element not found", parentElementId);
        return;
      }
      parentElement.appendChild(speedInfoElement);
    }

    const vehicle = vehicleCurves.vehicleData[selectedVehicle];
    const vehicleName = vehicle ? vehicle.name : "Allgemeines Fahrzeug";

    // Calculate charging speed statistics
    const chargingPowers = Object.values(vehicle.chargingCurves["400"]); // FIXME: use the actual charging power and get closest value
    const maxPowerVehicle =
      (chargingType === "AC"
        ? vehicle.maxChargingPowerAC
        : vehicle.maxChargingPowerDC) ||
      vehicle.maxChargingPower ||
      999;
    const minPowerVehicle = 0;
    // vehicle.minChargingPower || Math.min(...chargingPowers);

    const maxPowerSession = Math.max(...chargingResult.powerSteps);
    const minPowerSession = Math.min(...chargingResult.powerSteps);
    const avgPowerSession = chargingResult.averagePower;

    const maxProgressbarValue = Math.max(
      maxPowerSession,
      maxPowerVehicle,
      chargingResult.chargerPower
    );

    const progressbarData = this.calculateRangeData(
      0,
      maxProgressbarValue,
      maxProgressbarValue
    );

    // Values that are used in the current session
    const sessionRangeData = this.calculateRangeData(
      minPowerSession,
      maxPowerSession,
      maxProgressbarValue
    );

    // Values that are possible with this car and setup
    const vehicleRangeData = this.calculateRangeData(
      minPowerVehicle,
      maxPowerVehicle,
      maxProgressbarValue
    );

    speedInfoElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-car" style="color: #0ea5e9;"></i>
        <strong>Ladegeschwindigkeit - ${vehicleName}</strong>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; font-size: 0.8rem;">
        <div>
          <div style="font-weight: 600; color: #0ea5e9;">
            Ø ${avgPowerSession.toFixed(1)} kW
          </div>
          <div class="power-progress-container">
            <div class="power-progress-row">
              <div class="power-range-indicator-icon">
                <i class="fas fa-plug"></i>
              </div>
              <div>
                <div class="power-range-indicators" id="power-range-indicators-session"
                  style="
                    padding-left: ${sessionRangeData.paddingLeftPercentage}%;
                    padding-right: ${sessionRangeData.paddingRightPercentage}%;
                  "
                >
                  <span class="power-range-min">
                    ${
                      sessionRangeData.min > progressbarData.min &&
                      sessionRangeData.min !== sessionRangeData.max
                        ? `${sessionRangeData.min.toFixed(1)} kW`
                        : ""
                    }
                  </span>
                  <span class="power-range-max">
                    ${sessionRangeData.max.toFixed(1)} kW
                  </span>
                </div>
                <div class="power-range-progress-bar">
                  <div class="power-range-fill"
                    style="
                      left: ${sessionRangeData.minPercentage}%;
                      width: ${sessionRangeData.widthPercentage}%;">
                  </div>
                </div>
              </div>
            </div>
            <div class="power-progress-row">
              <div class="power-range-indicator-icon">
                <i class="fas fa-car text-xl"></i>
              </div>
              <div>
                <div class="power-range-indicators" id="power-range-indicators-vehicle">
                  <span class="power-range-min"
                    style="
                      padding-left: ${vehicleRangeData.paddingLeftPercentage}%;
                    "
                  >
                    ${
                      vehicleRangeData.min > progressbarData.min &&
                      vehicleRangeData.min !== vehicleRangeData.max
                        ? `${vehicleRangeData.min.toFixed(1)} kW`
                        : ""
                    }
                  </span>
                  <!--<span></span>  this span is used to keep space-between effect -->
                  <span class="power-range-max"
                    style="
                      padding-right: ${
                        vehicleRangeData.paddingRightPercentage
                      }%;
                    "
                  >
                    ${vehicleRangeData.max.toFixed(1)} kW
                  </span>
                </div>
                <div class="power-range-progress-bar">
                  <div class="power-range-fill"
                    style="
                      left: ${vehicleRangeData.minPercentage}%;
                      width: ${vehicleRangeData.widthPercentage}%;
                    ">
                  </div>
                </div>
              </div>
            </div>
            <div class="power-progress-row">
              <div class="power-range-indicator-icon">
                <i class="fas"></i>
              </div>
              <div>
                <div class="power-range-indicators">
                  <span class="power-range-min">
                    ${progressbarData.min.toFixed(1)} kW
                  </span>
                  <span class="power-range-max">
                    ${progressbarData.max.toFixed(1)} kW
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    //   <div>
    //   <div style="color: #64748b; font-weight: 500;">Effizienz</div>
    //   <div style="font-weight: 600; color: #0ea5e9;">${(
    //     (sessionRangeData.avgPower /
    //       parseFloat(document.getElementById("chargingPower").value)) *
    //     100
    //   ).toFixed(0)}%</div>
    // </div>
  }
}

export default VehicleDetails;
