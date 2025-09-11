class ChargingCalculator {
  constructor() {
    this.tariffManager = new TariffManager();
    this.tariffs = [];
    this.selectedProviders = new Set();
    this.selectedConnectors = new Set();
    this.mapsManager = new GoogleMapsManager(true); // false to disable map
    this.chargingChart = null;
    this.vehicleCurves = new VehicleChargingCurves();
    this.selectedVehicle = "renault-5-e-tech-52kwh"; // Default vehicle

    this.init();
  }

  async init() {
    const startTime = new Date();
    const startTimeString = startTime.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    document.getElementById("startTime").value = startTimeString;

    await this.loadTariffs();
    this.setupEventListeners();
    this.populateProviderFilters();
    this.populateConnectorFilters();
    this.populateTariffTable();
    // this.mapsManager.setAvailableTariffs(this.tariffs);
    this.updateCalculations();
    this.initializeChargingChart();
    await this.mapsManager.initializeMap("map");
  }

  // Load tariff data from JSON file
  async loadTariffs() {
    try {
      const response = await fetch("tariffs.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const providersData = await response.json();

      // Load data into TariffManager
      this.tariffManager.loadFromJson(providersData);
      this.tariffs = this.tariffManager.tariffs;
    } catch (error) {
      console.error("Error loading tariffs:", error);
      // Fallback to empty array if loading fails
      this.tariffs = [];
      this.tariffManager = new TariffManager();
      alert("Fehler beim Laden der Tarifdaten. Bitte laden Sie die Seite neu.");
    }
  }

  setupEventListeners() {
    // Form inputs
    document
      .getElementById("batteryCapacity")
      .addEventListener("input", () => this.updateCalculations());
    document.getElementById("currentCharge").addEventListener("input", (e) => {
      document.getElementById("currentChargeValue").textContent =
        e.target.value + "%";
      this.updateCalculations();
    });
    document.getElementById("targetCharge").addEventListener("input", (e) => {
      document.getElementById("targetChargeValue").textContent =
        e.target.value + "%";
      this.updateCalculations();
    });
    document
      .getElementById("chargingPower")
      .addEventListener("change", () => this.updateCalculations());
    document.getElementById("vehicleSelect").addEventListener("change", (e) => {
      this.selectedVehicle = e.target.value;
      this.updateCalculations();
      this.updateChargingChart();
    });
    document
      .getElementById("startTime")
      .addEventListener("change", () => this.updateCalculations());
    document
      .getElementById("endTime")
      .addEventListener("change", () => this.updateCalculations());

    // Clear buttons
    document.querySelectorAll(".clear-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const targetId = e.target.closest(".clear-btn").dataset.target;
        this.clearInput(targetId);
      });
    });

    // Legend toggle functionality
    this.setupLegendToggles();

    // Clear all button
    document.getElementById("clearAll").addEventListener("click", () => {
      this.clearAllInputs();
    });

    // Filter buttons
    document
      .getElementById("selectAll")
      .addEventListener("click", () => this.selectAllProviders());
    document
      .getElementById("selectNone")
      .addEventListener("click", () => this.selectNoProviders());

    // Connector filter buttons
    document
      .getElementById("selectAllConnectors")
      .addEventListener("click", () => this.selectAllConnectors());
    document
      .getElementById("selectNoConnectors")
      .addEventListener("click", () => this.selectNoConnectors());

    // Filter tabs
    document.querySelectorAll(".filter-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const tabName = e.target.dataset.tab;
        this.switchFilterTab(tabName);
      });
    });

    // Map controls
    // document
    //   .getElementById("locateMe")
    //   .addEventListener("click", () => this.mapsManager.locateUser());
    // document
    //   .getElementById("refreshStations")
    //   .addEventListener("click", () =>
    //     this.mapsManager.refreshChargingStations()
    //   );
  }

  populateProviderFilters() {
    const container = document.getElementById("providerCheckboxes");
    const uniqueProviders = this.tariffManager.getUniqueProviders();

    container.innerHTML = uniqueProviders
      .map(
        (provider) => `
            <div class="checkbox-item">
                <input type="checkbox" id="provider-${provider
                  .replace(/\s+/g, "-")
                  .toLowerCase()}"
                       value="${provider}" checked>
                <label for="provider-${provider
                  .replace(/\s+/g, "-")
                  .toLowerCase()}">${provider}</label>
            </div>
        `
      )
      .join("");

    // Add event listeners to checkboxes
    container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.selectedProviders.add(e.target.value);
        } else {
          this.selectedProviders.delete(e.target.value);
        }
        this.populateTariffTable();
      });
    });

    // Initialize selected providers
    this.selectedProviders = new Set(uniqueProviders);
  }

  selectAllProviders() {
    document
      .querySelectorAll('#providerCheckboxes input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = true;
        this.selectedProviders.add(checkbox.value);
      });
    this.populateTariffTable();
  }

  selectNoProviders() {
    document
      .querySelectorAll('#providerCheckboxes input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = false;
      });
    this.selectedProviders.clear();
    this.populateTariffTable();
  }

  populateConnectorFilters() {
    const container = document.getElementById("connectorCheckboxes");

    // Define common connector types with their display names
    const connectorTypes = [
      {
        id: "TYPE_1",
        name: "Type 1 (J1772)",
        description: "AC-Ladung, hauptsächlich in Nordamerika",
      },
      {
        id: "TYPE_2",
        name: "Type 2 (Mennekes)",
        description: "AC-Ladung, Standard in Europa",
      },
      {
        id: "CCS_1",
        name: "CCS 1",
        description: "DC-Schnellladung, Nordamerika",
      },
      { id: "CCS_2", name: "CCS 2", description: "DC-Schnellladung, Europa" },
      {
        id: "CHAdeMO",
        name: "CHAdeMO",
        description: "DC-Schnellladung, hauptsächlich Japan",
      },
      {
        id: "TESLA",
        name: "Tesla Supercharger",
        description: "Tesla-eigene DC-Schnellladung",
      },
      {
        id: "SCHUKO",
        name: "Schuko",
        description: "Haushaltssteckdose, AC-Ladung",
      },
    ];

    container.innerHTML = connectorTypes
      .map(
        (connector) => `
            <div class="checkbox-item">
                <input type="checkbox" id="connector-${connector.id.toLowerCase()}"
                       value="${connector.id}" checked>
                <label for="connector-${connector.id.toLowerCase()}">
                  <strong>${connector.name}</strong>
                  <br><small style="color: var(--text-secondary);">${
                    connector.description
                  }</small>
                </label>
            </div>
        `
      )
      .join("");

    // Add event listeners to connector checkboxes
    container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.selectedConnectors.add(e.target.value);
        } else {
          this.selectedConnectors.delete(e.target.value);
        }
        this.populateTariffTable();
      });
    });

    // Initialize selected connectors
    this.selectedConnectors = new Set(connectorTypes.map((c) => c.id));
  }

  selectAllConnectors() {
    document
      .querySelectorAll('#connectorCheckboxes input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = true;
        this.selectedConnectors.add(checkbox.value);
      });
    this.populateTariffTable();
  }

  selectNoConnectors() {
    document
      .querySelectorAll('#connectorCheckboxes input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = false;
      });
    this.selectedConnectors.clear();
    this.populateTariffTable();
  }

  switchFilterTab(tabName) {
    // Update tab buttons
    document.querySelectorAll(".filter-tab").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

    // Update tab content
    document.querySelectorAll(".filter-content").forEach((content) => {
      content.classList.remove("active");
    });
    document.getElementById(`${tabName}-tab`).classList.add("active");
  }

  updateCalculations() {
    const batteryCapacity =
      parseFloat(document.getElementById("batteryCapacity").value) || 0;
    const currentCharge =
      parseFloat(document.getElementById("currentCharge").value) || 0;
    const targetCharge =
      parseFloat(document.getElementById("targetCharge").value) || 0;
    const chargingPower =
      parseFloat(document.getElementById("chargingPower").value) || 0;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;

    // Only calculate if we have the minimum required values
    if (
      batteryCapacity > 0 &&
      targetCharge > currentCharge &&
      chargingPower > 0
    ) {
      // Use vehicle-specific charging curves for more accurate calculation
      const chargingResult = this.vehicleCurves.calculateChargingTime(
        this.selectedVehicle,
        currentCharge,
        targetCharge,
        chargingPower,
        batteryCapacity
      );

      const energyToCharge = chargingResult.totalEnergy;
      const estimatedTime = chargingResult.totalTime; // in minutes

      // Calculate total parking time from start and end time
      let totalParkingTime = 0;
      if (endTime) {
        totalParkingTime = this.calculateTimeDifference(startTime, endTime);
      } else {
        totalParkingTime = estimatedTime;
      }

      let totalParkingTimeString;
      if (totalParkingTime < 60) {
        totalParkingTimeString = totalParkingTime + " min";
      } else {
        totalParkingTimeString = `${Math.round(
          totalParkingTime / 60
        )}:${Math.round(totalParkingTime % 60)} h`;
      }

      document.getElementById(
        "energyToCharge"
      ).textContent = `${energyToCharge.toFixed(1)} kWh`;

      let estimatedTimeString;
      if (estimatedTime < 60) {
        estimatedTimeString = Math.round(estimatedTime) + " min";
      } else {
        estimatedTimeString = `${Math.round(estimatedTime / 60)}:${Math.round(
          estimatedTime % 60
        )} h`;
      }
      document.getElementById("estimatedTime").textContent =
        estimatedTimeString;
      document.getElementById("totalParkingTime").textContent =
        totalParkingTimeString;

      // Update charging speed information
      this.updateChargingSpeedInfo(chargingResult);
    } else {
      // Show placeholder values when inputs are empty or invalid
      document.getElementById("energyToCharge").textContent = "— kWh";
      document.getElementById("estimatedTime").textContent = "— min";
      document.getElementById("totalParkingTime").textContent = "— min";
      // document.getElementById("endTime").value =
      //   endTime || startTime + totalParkingTime;
    }

    this.populateTariffTable();
  }

  clearInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === "range") {
      // For range inputs, set to minimum value
      if (inputId === "currentCharge") {
        input.value = "0";
        document.getElementById("currentChargeValue").textContent = "0%";
      } else if (inputId === "targetCharge") {
        input.value = "0";
        document.getElementById("targetChargeValue").textContent = "0%";
      }
    } else {
      // Empty the input
      input.value = "";
    }

    // Trigger change event to update calculations
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  clearAllInputs() {
    // Clear all individual inputs
    const inputsToClear = [
      "batteryCapacity",
      "currentCharge",
      "targetCharge",
      "startTime",
      "endTime",
    ];

    inputsToClear.forEach((inputId) => {
      this.clearInput(inputId);
    });

    // Clear charging power selection
    document.getElementById("chargingPower").selectedIndex = -1;

    // Select all providers and connectors
    this.selectAllProviders();
    this.selectAllConnectors();

    // Show confirmation
    const button = document.getElementById("clearAll");
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Geleert!';
    button.style.background = "var(--success-color)";

    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.background = "";
    }, 2000);
  }

  calculateTimeDifference(startTime, endTime) {
    // Return 0 if either time is empty
    if (!startTime || !endTime) {
      return 0;
    }

    // Convert time strings to minutes since midnight
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    // Handle case where end time is next day
    if (endMinutes < startMinutes) {
      return 24 * 60 - startMinutes + endMinutes;
    }

    return endMinutes - startMinutes;
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

  populateTariffTable() {
    const tbody = document.getElementById("tariffTableBody");
    const batteryCapacity =
      parseFloat(document.getElementById("batteryCapacity").value) || 0;
    const currentCharge =
      parseFloat(document.getElementById("currentCharge").value) || 0;
    const targetCharge =
      parseFloat(document.getElementById("targetCharge").value) || 0;
    const chargingPower =
      parseFloat(document.getElementById("chargingPower").value) || 0;
    const startTime = document.getElementById("startTime").value;
    let endTime = document.getElementById("endTime").value;

    // Check if we have enough data to calculate
    if (
      batteryCapacity <= 0 ||
      targetCharge <= currentCharge ||
      chargingPower <= 0
    ) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            <i class="fas fa-info-circle"></i> Bitte füllen Sie alle erforderlichen Felder aus
          </td>
        </tr>
      `;
      return;
    }

    const energyToCharge =
      (batteryCapacity * (targetCharge - currentCharge)) / 100;
    const estimatedTime = (energyToCharge / chargingPower) * 60;
    let totalParkingTime = 0;
    if (endTime) {
      totalParkingTime = this.calculateTimeDifference(startTime, endTime);
    } else {
      // Fix: If endTime is not set, use estimatedTime as totalParkingTime (in minutes)
      totalParkingTime = estimatedTime;
    }

    // Filter tariffs based on selected providers and connectors
    const filteredTariffs = this.tariffManager.getFilteredTariffs({
      providers: Array.from(this.selectedProviders),
      connectors: Array.from(this.selectedConnectors),
    });

    const endTimeMinutes = this.timeToMinutes(startTime) + totalParkingTime;
    const endTimeDate = this.minutesToTime(endTimeMinutes);

    endTime =
      endTime ||
      endTimeDate.toLocaleString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });

    // FIXME: move to a better place
    document.getElementById("endTime").value = endTime;

    // Sort provider tariffs by total cost using the new class methods
    const blockingTime = Math.max(0, totalParkingTime);
    const sortedProviderTariffs = this.tariffManager
      .sortByCost(
        filteredTariffs,
        energyToCharge,
        estimatedTime,
        blockingTime,
        startTime,
        endTime
      )
      .map((result) => {
        const tariff = result.tariff;
        result.name = tariff.name;
        result.providerName = tariff.providerName;
        // Preserve the class instance and add calculated properties
        result.energyCost = energyToCharge * tariff.pricePerKwh;
        // tariff.energyCost = energyToCharge * tariff.pricePerKwh;
        result.timeCost = this.calculateTimeCost(tariff, estimatedTime);
        // tariff.timeCost = this.calculateTimeCost(tariff, estimatedTime);
        // tariff.blockingFeeString =
        result.pricePerKwh = tariff.pricePerKwh;
        // const blockingFeePerMin = this.getBlockingFeeForTariff(tariff);
        // tariff.blockingFee = tariff.blockingFee; // ? blockingTime * blockingFeePerMin : 0;
        // tariff.totalCost = result.totalCost;
        // tariff.effectivePricePerKwh = result.effectivePricePerKwh;
        result.tariff = tariff;
        return result;
      });

    // Calculate custom tariff separately
    const customTariff = this.calculateCustomTariff(
      energyToCharge,
      estimatedTime,
      blockingTime
    );

    // Combine and sort all tariffs
    const allTariffs = [customTariff, ...sortedProviderTariffs];
    const sortedTariffs = allTariffs.sort((a, b) => a.totalCost - b.totalCost);

    // Create custom tariff row
    const customTariffRow = this.createCustomBlockingFeeRow();

    tbody.innerHTML =
      customTariffRow +
      sortedTariffs
        .map((tariff) => {
          // <td class="price">${
          //   tariff.baseFee ? tariff.baseFee.toFixed(2) + " €" : "-"
          // }</td>
          //       <td><span class="charging-type ${(
          //         tariff.type ||
          //         tariff.providerType ||
          //         "AC"
          //       ).toLowerCase()}">${
          //   tariff.type || tariff.providerType || "AC"
          // }</span></td>
          return `
            <tr>
                <td class="provider-name">
                  <div class="provider-info">
                    <strong>${tariff.providerName}</strong>
                    ${
                      tariff.name && tariff.name.trim()
                        ? `<br><small class="tariff-name">${tariff.name}</small>`
                        : ""
                    }
                  </div>
                </td>
                <td class="price">${tariff.pricePerKwh.toFixed(2)} €/kWh</td>
                <td class="price">${tariff.blockingFeeString}</td>
                <td class="price">${tariff.energyCost.toFixed(2)} €</td>
                <td class="price">${
                  tariff.blockingFee
                    ? tariff.blockingFee.toFixed(2) + " €"
                    : "-"
                }</td>
                <td class="total-cost">${tariff.totalCost.toFixed(2)} €</td>
                <td class="effective-price">${tariff.effectivePricePerKwh.toFixed(
                  2
                )} €</td>
            </tr>
        `;
        })
        .join("");

    // Event listeners are now set up in createCustomBlockingFeeRow

    // Update custom tariff display
    this.updateCustomTariffDisplay(energyToCharge);

    // Update header with actual energy amount
    this.updatePricePerSelectedKwhHeader(energyToCharge);

    // Update charging chart
    this.updateChargingChart();
  }

  setupCustomTariffEventListeners() {
    // Remove existing event listeners to prevent duplication
    document.querySelectorAll(".custom-tariff-input").forEach((input) => {
      // Clone the element to remove all event listeners
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);
    });

    // Add fresh event listeners
    document.querySelectorAll(".custom-tariff-input").forEach((input) => {
      input.addEventListener("input", () => {
        this.updateCalculations();
        // Also update the custom tariff display immediately
        const batteryCapacity =
          parseFloat(document.getElementById("batteryCapacity").value) || 0;
        const currentCharge =
          parseFloat(document.getElementById("currentCharge").value) || 0;
        const targetCharge =
          parseFloat(document.getElementById("targetCharge").value) || 0;
        if (batteryCapacity > 0 && targetCharge > currentCharge) {
          const energyToCharge =
            (batteryCapacity * (targetCharge - currentCharge)) / 100;
          this.updateCustomTariffDisplay(energyToCharge);
        }
      });
    });
  }

  updateCustomTariffOnInput() {
    this.updateCalculations();
    // Also update the custom tariff display immediately
    const batteryCapacity =
      parseFloat(document.getElementById("batteryCapacity").value) || 0;
    const currentCharge =
      parseFloat(document.getElementById("currentCharge").value) || 0;
    const targetCharge =
      parseFloat(document.getElementById("targetCharge").value) || 0;
    if (batteryCapacity > 0 && targetCharge > currentCharge) {
      const energyToCharge =
        (batteryCapacity * (targetCharge - currentCharge)) / 100;
      this.updateCustomTariffDisplay(energyToCharge);
    }
  }

  setupBlockingFeeInputs() {
    // This function is kept for backward compatibility but now just calls the new function
    this.setupCustomTariffEventListeners();
  }

  updateCustomTariffDisplay(energyToCharge) {
    const customPricePerKwh =
      parseFloat(document.getElementById("custom-price-per-kwh")?.value) || 0.5;
    const customBaseFee =
      parseFloat(document.getElementById("custom-base-fee")?.value) || 0.0;
    const customBlockingFee =
      parseFloat(document.getElementById("custom-blocking-fee")?.value) || 0.1;

    const pricePerSelectedKwh = customPricePerKwh * energyToCharge;

    // Calculate estimated time and blocking time
    const batteryCapacity =
      parseFloat(document.getElementById("batteryCapacity").value) || 0;
    const currentCharge =
      parseFloat(document.getElementById("currentCharge").value) || 0;
    const targetCharge =
      parseFloat(document.getElementById("targetCharge").value) || 0;
    const chargingPower =
      parseFloat(document.getElementById("chargingPower").value) || 0;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;

    let totalCost = 0;
    let effectivePricePerKwh = 0;

    if (
      batteryCapacity > 0 &&
      targetCharge > currentCharge &&
      chargingPower > 0
    ) {
      const estimatedTime =
        ((batteryCapacity * (targetCharge - currentCharge)) /
          100 /
          chargingPower) *
        60;
      const totalParkingTime = this.calculateTimeDifference(startTime, endTime);
      const blockingTime = Math.max(0, totalParkingTime - estimatedTime);

      // Calculate total cost (matching calculateCustomTariff logic)
      const energyCost = energyToCharge * customPricePerKwh;
      const timeCost = 0; // Custom tariff doesn't have pricePerMin, so timeCost is always 0
      const blockingFeeCost = blockingTime * customBlockingFee;
      totalCost = energyCost + timeCost + customBaseFee + blockingFeeCost;
      effectivePricePerKwh =
        energyToCharge > 0 ? totalCost / energyToCharge : 0;
    }

    // Update price per selected kWh
    const pricePerSelectedKwhElement = document.getElementById(
      "custom-price-per-selected-kwh"
    );
    if (pricePerSelectedKwhElement) {
      pricePerSelectedKwhElement.textContent = `${pricePerSelectedKwh.toFixed(
        2
      )} €`;
    }

    // Update total cost
    const totalCostElement = document.getElementById("custom-total-cost");
    if (totalCostElement) {
      totalCostElement.textContent = `${totalCost.toFixed(2)} €`;
    }

    // Update effective price per kWh
    const effectivePriceElement = document.getElementById(
      "custom-effective-price"
    );
    if (effectivePriceElement) {
      effectivePriceElement.textContent = `${effectivePricePerKwh.toFixed(
        2
      )} €`;
    }
  }

  updatePricePerSelectedKwhHeader(energyToCharge) {
    const headerElement = document.getElementById("pricePerSelectedKwh");
    if (headerElement) {
      headerElement.textContent = `${energyToCharge.toFixed(1)} kWh`;
    }
  }

  createCustomBlockingFeeRow() {
    // Calculate initial energy cost dynamically
    const batteryCapacity =
      parseFloat(document.getElementById("batteryCapacity")?.value) || 0;
    const currentCharge =
      parseFloat(document.getElementById("currentCharge")?.value) || 0;
    const targetCharge =
      parseFloat(document.getElementById("targetCharge")?.value) || 0;

    const energyToCharge =
      batteryCapacity > 0 && targetCharge > currentCharge
        ? (batteryCapacity * (targetCharge - currentCharge)) / 100
        : 0;

    const customPricePerKwh = 0.5; // Default value
    const initialEnergyCost = energyToCharge * customPricePerKwh;

    // REVIEW
    const customBlockingFee = 0.1;
    const initialBlockingFee = energyToCharge * customBlockingFee;

    // <td><span class="charging-type ac">AC/DC</span></td>

    //   <td class="price">
    //   <input type="number"
    //          class="custom-tariff-input"
    //          id="custom-base-fee"
    //          value="0.00"
    //          min="0"
    //          max="50"
    //          step="0.01"
    //          title="Grundgebühr"
    //          oninput="window.chargingCalculator.updateCustomTariffOnInput()"
    //          style="width: 80px; padding: 4px; border: 1px solid #ccc; border-radius: 4px; text-align: center;">
    //   €
    // </td>

    return `
      <tr class="custom-tariff-row" style="background-color: #f0f9ff; border-bottom: 2px solid var(--primary-color);">
        <td class="provider-name" style="font-weight: 600; color: var(--primary-color);">
          <div class="provider-info">
            <strong><i class="fas fa-edit"></i> Eigener Tarif</strong>
            <br><small class="tariff-name" style="color: var(--text-secondary);">Vergleichstarif</small>
          </div>
        </td>
        <td class="price">
          <input type="number"
                 class="custom-tariff-input"
                 id="custom-price-per-kwh"
                 value="0.50"
                 min="0"
                 max="2"
                 step="0.01"
                 title="Preis pro kWh"
                 oninput="window.chargingCalculator.updateCustomTariffOnInput()"
                 style="width: 80px; padding: 4px; border: 1px solid #ccc; border-radius: 4px; text-align: center;">
          €
        </td>
        <td class="price">
          <input type="number"
                 class="custom-tariff-input"
                 id="custom-blocking-fee"
                 value="0.10"
                 min="0"
                 max="2"
                 step="0.01"
                 title="Blocking Fee pro Minute"
                 oninput="window.chargingCalculator.updateCustomTariffOnInput()"
                 style="width: 80px; padding: 4px; border: 1px solid #ccc; border-radius: 4px; text-align: center;">
          €/min
        </td>
        <td class="price" id="custom-price-per-selected-kwh">${initialEnergyCost.toFixed(
          2
        )} €</td>
        <td class="price">${initialBlockingFee.toFixed(2)} €</td>
        <td class="total-cost" id="custom-total-cost">— €</td>
        <td class="effective-price" id="custom-effective-price">— €</td>
      </tr>
    `;
  }

  getCustomTariffData() {
    return {
      name: "Eigener Tarif",
      providerName: "Eigener Tarif",
      type: "AC/DC",
      pricePerKwh:
        parseFloat(document.getElementById("custom-price-per-kwh")?.value) ||
        0.5,
      pricePerMin:
        parseFloat(document.getElementById("custom-price-per-min")?.value) ||
        0.0,
      baseFee:
        parseFloat(document.getElementById("custom-base-fee")?.value) || 0.0,
      blockingFee:
        parseFloat(document.getElementById("custom-blocking-fee")?.value) ||
        0.1,
      connectors: [
        "TYPE_1",
        "TYPE_2",
        "CCS_1",
        "CCS_2",
        "CHAdeMO",
        "TESLA",
        "SCHUKO",
      ],
    };
  }

  calculateCustomTariff(energyToCharge, estimatedTime, blockingTime) {
    const customData = this.getCustomTariffData();

    // Calculate costs
    const energyCost = energyToCharge * customData.pricePerKwh;
    const timeCost = Math.min(estimatedTime * customData.pricePerMin, 12); // Cap at 12€ like other tariffs
    const blockingFee = blockingTime * customData.blockingFee;
    const totalCost = energyCost + timeCost + customData.baseFee + blockingFee;
    const effectivePricePerKwh = totalCost / energyToCharge;

    return {
      ...customData,
      energyCost,
      timeCost,
      blockingFee,
      totalCost,
      effectivePricePerKwh,
      getBaseFee: () => customData.baseFee,
      isCompatibleWithConnectors: () => true,
    };
  }

  getDefaultCustomBlockingFee(tariff) {
    // Use provider's blocking fee as default, or 0.10 if not available
    if (tariff.blockingFee && typeof tariff.blockingFee === "object") {
      return tariff.blockingFee.pricePerMin.toFixed(2);
    } else if (tariff.blockingFee === false) {
      return "0.00";
    }
    return "0.10";
  }

  getBlockingFeeForTariff(tariff) {
    // For custom tariff, use the blocking fee directly (it's already calculated)
    if (tariff.name === "Eigener Tarif") {
      return tariff.blockingFee;
    }

    // For provider tariffs, use their blocking fee
    if (tariff.blockingFee === false) {
      return 0;
    } else if (tariff.blockingFee && typeof tariff.blockingFee === "object") {
      // Handle conditional blocking fees
      if (tariff.blockingFee.conditions) {
        if (tariff.blockingFee.conditions.daytime) {
          // TODO: Calculate price per min with maxPrice for specific time window
          // For now, return the base pricePerMin
        } else if (tariff.blockingFee.conditions.durationHours) {
          // TODO: Calculate price per min with maxPrice for specific duration
          // For now, return the base pricePerMin
        }
      }
      return tariff.blockingFee.pricePerMin || 0;
    }

    // Default fallback
    return 0;
  }

  isTariffCompatibleWithSelectedConnectors(tariff) {
    // If no connectors are selected, show all tariffs
    if (this.selectedConnectors.size === 0) {
      return true;
    }

    // Use the new class method for compatibility checking
    return tariff.isCompatibleWithConnectors(
      Array.from(this.selectedConnectors)
    );
  }

  getTariffConnectors(tariff) {
    // If tariff has explicit connector information, use it
    if (tariff.connectors && Array.isArray(tariff.connectors)) {
      return tariff.connectors;
    }

    // Check provider-level connectors
    if (tariff.providerConnectors && Array.isArray(tariff.providerConnectors)) {
      return tariff.providerConnectors;
    }

    // Fallback: Map tariff types to compatible connectors
    const connectorMapping = {
      AC: ["TYPE_1", "TYPE_2", "SCHUKO"],
      DC: ["CCS_1", "CCS_2", "CHAdeMO", "TESLA"],
    };

    // Get base connectors for the tariff type
    const tariffType = tariff.type || tariff.providerType;
    let connectors = connectorMapping[tariffType] || [];

    // Add specific connectors based on tariff name/description
    const name = (tariff.name || "").toLowerCase();
    const providerName = (tariff.providerName || "").toLowerCase();
    const description = (tariff.description || "").toLowerCase();

    if (
      name.includes("tesla") ||
      providerName.includes("tesla") ||
      description.includes("tesla")
    ) {
      connectors = ["TESLA"];
    } else if (
      name.includes("ccs") ||
      providerName.includes("ccs") ||
      description.includes("ccs")
    ) {
      if (tariffType === "DC") {
        connectors = ["CCS_1", "CCS_2"];
      }
    } else if (
      name.includes("chademo") ||
      providerName.includes("chademo") ||
      description.includes("chademo")
    ) {
      connectors = ["CHAdeMO"];
    } else if (
      name.includes("type 1") ||
      providerName.includes("type 1") ||
      description.includes("type 1")
    ) {
      connectors = ["TYPE_1"];
    } else if (
      name.includes("type 2") ||
      providerName.includes("type 2") ||
      description.includes("type 2")
    ) {
      connectors = ["TYPE_2"];
    } else if (
      name.includes("schuko") ||
      providerName.includes("schuko") ||
      description.includes("schuko")
    ) {
      connectors = ["SCHUKO"];
    }

    return connectors;
  }

  getAvailableTariffsForStation(station) {
    // Return relevant tariffs for the station type using the new class system
    const stationType =
      station.type === "DC" && station.power.includes("kW") ? "DC" : "AC";
    return this.tariffManager.getFilteredTariffs({
      types: [stationType],
    });
  }

  calculateTimeCost(tariff, estimatedTime) {
    // If no time-based cost at all
    if (
      !tariff.pricePerMin &&
      (!tariff.blockingFee || !tariff.blockingFee.pricePerMin)
    ) {
      return 0;
    }

    // If tariff has a simple pricePerMin (legacy/flat)
    if (typeof tariff.pricePerMin === "number" && tariff.pricePerMin > 0) {
      let timeCost = estimatedTime * tariff.pricePerMin;

      // Check for max cap in blockingFee (Mobility+ S, Qwello, etc)
      if (
        tariff.blockingFee &&
        (tariff.blockingFee.maxPerSession ||
          tariff.blockingFee.maxPricePerSession)
      ) {
        const cap =
          tariff.blockingFee.maxPerSession ||
          tariff.blockingFee.maxPricePerSession;
        if (typeof cap === "number" && cap > 0) {
          timeCost = Math.min(timeCost, cap);
        }
      }
      return timeCost;
    }

    // If tariff has a blockingFee object with pricePerMin
    if (
      tariff.blockingFee &&
      typeof tariff.blockingFee.pricePerMin === "number" &&
      tariff.blockingFee.pricePerMin > 0
    ) {
      let timeCost = estimatedTime * tariff.blockingFee.pricePerMin;

      // Qwello: night cap
      if (
        tariff.blockingFee.conditions &&
        tariff.blockingFee.conditions.daytime &&
        typeof tariff.blockingFee.conditions.daytime.maxPricen === "number"
      ) {
        // For now, always apply the cap if present (full implementation would check time window)
        timeCost = Math.min(
          timeCost,
          tariff.blockingFee.conditions.daytime.maxPrice
        );
      }

      // Mobility+ S: maxPerSession
      if (
        typeof tariff.blockingFee.maxPerSession === "number" &&
        tariff.blockingFee.maxPerSession > 0
      ) {
        timeCost = Math.min(timeCost, tariff.blockingFee.maxPerSession);
      }

      // Qwello: maxPricePerSession (legacy)
      if (
        typeof tariff.blockingFee.maxPricePerSession === "number" &&
        tariff.blockingFee.maxPricePerSession > 0
      ) {
        timeCost = Math.min(timeCost, tariff.blockingFee.maxPricePerSession);
      }

      return timeCost;
    }

    // If no time cost applies
    return 0;
  }

  // Charging Chart Methods
  initializeChargingChart() {
    const ctx = document.getElementById("chargingLevelChart");
    if (!ctx) return;

    this.chargingChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Ladeverlauf (realistisch)",
            data: [],
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#2563eb",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
          },
          {
            label: "Lineare Schätzung",
            data: [],
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: "#10b981",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            borderDash: [5, 5],
          },
          // Additional charging power curves
          {
            label: "400 kW (Ultra-Schnelllader)",
            data: [],
            borderColor: "#dc2626",
            backgroundColor: "rgba(220, 38, 38, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: "#dc2626",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 1,
            borderDash: [3, 3],
          },
          {
            label: "300 kW (Hochleistungslader)",
            data: [],
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: "#f59e0b",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 1,
            borderDash: [3, 3],
          },
          {
            label: "150 kW (Schnelllader)",
            data: [],
            borderColor: "#8b5cf6",
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: "#8b5cf6",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 1,
            borderDash: [3, 3],
          },
          {
            label: "50 kW (DC Schnelllader)",
            data: [],
            borderColor: "#06b6d4",
            backgroundColor: "rgba(6, 182, 212, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: "#06b6d4",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 1,
            borderDash: [3, 3],
          },
          {
            label: "22 kW (AC Wallbox)",
            data: [],
            borderColor: "#84cc16",
            backgroundColor: "rgba(132, 204, 22, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: "#84cc16",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 1,
            borderDash: [3, 3],
          },
          {
            label: "11 kW (AC Wallbox)",
            data: [],
            borderColor: "#f97316",
            backgroundColor: "rgba(249, 115, 22, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: "#f97316",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 1,
            borderDash: [3, 3],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Batterieladestand über Zeit",
            font: {
              size: 16,
              weight: "bold",
            },
            color: "#1e293b",
          },
          legend: {
            display: false, // We have our custom legend
          },
          tooltip: {
            mode: "index",
            intersect: false,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            borderColor: "#e2e8f0",
            borderWidth: 1,
            callbacks: {
              title: function (context) {
                return `Zeit: ${context[0].label}`;
              },
              label: function (context) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(
                  1
                )}%`;
              },
            },
          },
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: "Ladezeit (Minuten)",
              font: {
                weight: "bold",
              },
              color: "#64748b",
            },
            grid: {
              color: "#e2e8f0",
              drawBorder: false,
            },
            ticks: {
              color: "#64748b",
            },
          },
          y: {
            display: true,
            title: {
              display: true,
              text: "Batterieladestand (%)",
              font: {
                weight: "bold",
              },
              color: "#64748b",
            },
            min: 0,
            max: 100,
            grid: {
              color: "#e2e8f0",
              drawBorder: false,
            },
            ticks: {
              color: "#64748b",
              callback: function (value) {
                return value + "%";
              },
            },
          },
        },
        interaction: {
          mode: "nearest",
          axis: "x",
          intersect: false,
        },
        elements: {
          point: {
            hoverBackgroundColor: "#ffffff",
          },
        },
      },
    });

    // Initial empty state
    this.updateChargingChart();
  }

  updateChargingChart() {
    if (!this.chargingChart) return;

    const batteryCapacity =
      parseFloat(document.getElementById("batteryCapacity").value) || 0;
    const currentCharge =
      parseFloat(document.getElementById("currentCharge").value) || 0;
    const targetCharge =
      parseFloat(document.getElementById("targetCharge").value) || 0;
    const chargingPower =
      parseFloat(document.getElementById("chargingPower").value) || 0;

    // Check if we have enough data to calculate
    if (
      batteryCapacity <= 0 ||
      targetCharge <= currentCharge ||
      chargingPower <= 0
    ) {
      this.chargingChart.data.labels = [];
      this.chargingChart.data.datasets[0].data = [];
      this.chargingChart.data.datasets[1].data = [];
      this.chargingChart.update();
      return;
    }

    // Use vehicle-specific charging curves for more accurate calculation
    const chargingResult = this.vehicleCurves.calculateChargingTime(
      this.selectedVehicle,
      currentCharge,
      targetCharge,
      chargingPower,
      batteryCapacity
    );

    const estimatedTime = chargingResult.totalTime; // in minutes

    // Generate data points for the chart
    const timePoints = [];
    const realisticChargingLevels = [];
    const linearChargingLevels = [];

    // Additional charging power curves
    const chargingPowers = [400, 300, 150, 50, 22, 11];
    const additionalCurves = chargingPowers.map(() => []);

    // Create time points every 5 minutes or every minute for shorter sessions
    const interval = estimatedTime <= 30 ? 1 : 5;
    const maxTime = Math.ceil(estimatedTime * 1.2); // Show 20% more than estimated

    for (let time = 0; time <= maxTime; time += interval) {
      timePoints.push(time);

      // Linear charging (simple calculation)
      const linearLevel = Math.min(
        currentCharge + (time / estimatedTime) * (targetCharge - currentCharge),
        targetCharge
      );
      linearChargingLevels.push(linearLevel);

      // Vehicle-specific realistic charging curve
      const progress = Math.min(time / estimatedTime, 1);
      const batteryLevel =
        currentCharge + (targetCharge - currentCharge) * progress;
      realisticChargingLevels.push(batteryLevel);

      // Calculate additional charging power curves
      chargingPowers.forEach((power, index) => {
        const additionalResult = this.vehicleCurves.calculateChargingTime(
          this.selectedVehicle,
          currentCharge,
          targetCharge,
          power,
          batteryCapacity
        );

        const additionalProgress = Math.min(
          time / additionalResult.totalTime,
          1
        );
        const additionalLevel =
          currentCharge + (targetCharge - currentCharge) * additionalProgress;
        additionalCurves[index].push(additionalLevel);
      });
    }

    // Update chart data
    this.chargingChart.data.labels = timePoints.map((t) => `${t} min`);
    this.chargingChart.data.datasets[0].data = realisticChargingLevels;
    this.chargingChart.data.datasets[1].data = linearChargingLevels;

    // Update additional charging power curves
    additionalCurves.forEach((curve, index) => {
      this.chargingChart.data.datasets[index + 2].data = curve;
    });

    this.chargingChart.update();
  }

  calculateRealisticChargingLevel(
    currentCharge,
    targetCharge,
    time,
    estimatedTime,
    chargingPower
  ) {
    // Realistic charging curve that accounts for:
    // 1. Slower charging at higher battery levels (above 80%)
    // 2. Initial slower charging phase
    // 3. Temperature effects (simplified)

    const chargeRange = targetCharge - currentCharge;
    const progress = Math.min(time / estimatedTime, 1);

    // Base charging curve (S-curve)
    let chargingProgress;

    if (progress <= 0.1) {
      // Initial slow phase (0-10% of time)
      chargingProgress = 0.5 * Math.pow(progress / 0.1, 2);
    } else if (progress <= 0.8) {
      // Fast charging phase (10-80% of time)
      const fastProgress = (progress - 0.1) / 0.7;
      chargingProgress = 0.05 + 0.7 * fastProgress;
    } else {
      // Slower charging at high levels (80-100% of time)
      const slowProgress = (progress - 0.8) / 0.2;
      chargingProgress = 0.75 + 0.2 * Math.pow(slowProgress, 0.5);
    }

    // Apply power-dependent adjustments
    let powerFactor = 1;
    if (chargingPower <= 3.7) {
      // Very slow charging (household outlet)
      powerFactor = 0.8;
    } else if (chargingPower <= 11) {
      // AC charging
      powerFactor = 0.9;
    } else if (chargingPower >= 150) {
      // High power DC charging - more aggressive curve
      powerFactor = 1.1;
    }

    // Apply temperature simulation (simplified)
    const temperatureFactor = 0.95 + Math.random() * 0.1; // Random variation

    const adjustedProgress = Math.min(
      chargingProgress * powerFactor * temperatureFactor,
      1
    );
    const realisticLevel = currentCharge + chargeRange * adjustedProgress;

    return Math.min(realisticLevel, targetCharge);
  }

  /**
   * Update charging speed information display
   * @param {Object} chargingResult - Result from vehicle charging curves calculation
   */
  updateChargingSpeedInfo(chargingResult) {
    // Find or create charging speed info element
    let speedInfoElement = document.getElementById("chargingSpeedInfo");
    if (!speedInfoElement) {
      speedInfoElement = document.createElement("div");
      speedInfoElement.id = "chargingSpeedInfo";
      speedInfoElement.className = "charging-speed-info";
      speedInfoElement.style.cssText = `
        background: #f0f9ff;
        border: 1px solid #0ea5e9;
        border-radius: 8px;
        padding: 16px;
        margin-top: 16px;
        font-size: 0.875rem;
      `;

      // Insert after the estimated time element
      const parentElement = document.getElementById("vehicle-details");
      parentElement.appendChild(speedInfoElement);
    }

    const vehicle = this.vehicleCurves.vehicleData[this.selectedVehicle];
    const vehicleName = vehicle ? vehicle.name : "Allgemeines Fahrzeug";

    // Calculate charging speed statistics
    const maxPower = Math.max(...chargingResult.powerSteps);
    const minPower = Math.min(...chargingResult.powerSteps);
    const avgPower = chargingResult.averagePower;

    speedInfoElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <i class="fas fa-car" style="color: #0ea5e9;"></i>
        <strong>Ladegeschwindigkeit - ${vehicleName}</strong>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; font-size: 0.8rem;">
        <div>
          <div style="color: #64748b; font-weight: 500;">Max. Leistung</div>
          <div style="font-weight: 600; color: #0ea5e9;">${maxPower.toFixed(
            1
          )} kW</div>
        </div>
        <div>
          <div style="color: #64748b; font-weight: 500;">Min. Leistung</div>
          <div style="font-weight: 600; color: #0ea5e9;">${minPower.toFixed(
            1
          )} kW</div>
        </div>
        <div>
          <div style="color: #64748b; font-weight: 500;">Ø Leistung</div>
          <div style="font-weight: 600; color: #0ea5e9;">${avgPower.toFixed(
            1
          )} kW</div>
        </div>
        <div>
          <div style="color: #64748b; font-weight: 500;">Effizienz</div>
          <div style="font-weight: 600; color: #0ea5e9;">${(
            (avgPower /
              parseFloat(document.getElementById("chargingPower").value)) *
            100
          ).toFixed(0)}%</div>
        </div>
      </div>
    `;
  }

  /**
   * Setup legend toggle functionality
   */
  setupLegendToggles() {
    // Individual legend item toggles
    document.querySelectorAll(".legend-toggle").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const datasetIndex = parseInt(button.dataset.dataset);
        this.toggleDataset(datasetIndex);
      });
    });

    // Legend item clicks (alternative to button)
    document.querySelectorAll(".legend-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (!e.target.closest(".legend-toggle")) {
          const datasetIndex = parseInt(item.dataset.dataset);
          this.toggleDataset(datasetIndex);
        }
      });
    });

    // Show all curves button
    document.getElementById("showAllCurves").addEventListener("click", () => {
      this.showAllDatasets();
    });

    // Hide all curves button
    document.getElementById("hideAllCurves").addEventListener("click", () => {
      this.hideAllDatasets();
    });
  }

  /**
   * Toggle a specific dataset visibility
   * @param {number} datasetIndex - Index of the dataset to toggle
   */
  toggleDataset(datasetIndex) {
    if (!this.chargingChart) return;

    const dataset = this.chargingChart.data.datasets[datasetIndex];
    const legendItem = document.querySelector(
      `[data-dataset="${datasetIndex}"]`
    );

    if (dataset && legendItem) {
      // Toggle dataset visibility
      dataset.hidden = !dataset.hidden;

      // Update legend item appearance
      if (dataset.hidden) {
        legendItem.classList.add("hidden");
      } else {
        legendItem.classList.remove("hidden");
      }

      // Update chart
      this.chargingChart.update();
    }
  }

  /**
   * Show all datasets
   */
  showAllDatasets() {
    if (!this.chargingChart) return;

    this.chargingChart.data.datasets.forEach((dataset, index) => {
      dataset.hidden = false;
      const legendItem = document.querySelector(`[data-dataset="${index}"]`);
      if (legendItem) {
        legendItem.classList.remove("hidden");
      }
    });

    this.chargingChart.update();
  }

  /**
   * Hide all datasets except the first two (realistic and linear)
   */
  hideAllDatasets() {
    if (!this.chargingChart) return;

    this.chargingChart.data.datasets.forEach((dataset, index) => {
      // Keep the first two datasets (realistic and linear) visible
      if (index < 2) {
        dataset.hidden = false;
        const legendItem = document.querySelector(`[data-dataset="${index}"]`);
        if (legendItem) {
          legendItem.classList.remove("hidden");
        }
      } else {
        dataset.hidden = true;
        const legendItem = document.querySelector(`[data-dataset="${index}"]`);
        if (legendItem) {
          legendItem.classList.add("hidden");
        }
      }
    });

    this.chargingChart.update();
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  try {
    window.chargingCalculator = await new ChargingCalculator();
  } catch (error) {
    console.error("Error initializing charging calculator:", error);
  }
});

// Add some utility functions for better UX
document.addEventListener("DOMContentLoaded", () => {
  // Add smooth scrolling for better navigation
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // Add loading states for better feedback
  const forms = document.querySelectorAll("form");
  forms.forEach((form) => {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const submitButton = this.querySelector('button[type="submit"]');
      if (submitButton) {
        const originalText = submitButton.textContent;
        submitButton.textContent = "Wird berechnet...";
        submitButton.disabled = true;

        setTimeout(() => {
          submitButton.textContent = originalText;
          submitButton.disabled = false;
        }, 1000);
      }
    });
  });
});
