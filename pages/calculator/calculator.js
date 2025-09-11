class ChargingCalculator {
  constructor() {
    this.tariffManager = new TariffManager();
    this.tariffs = [];
    this.selectedProviders = new Set();
    this.selectedConnectors = new Set();
    this.mapsManager = new GoogleMapsManager(false); // false to disable map

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
      const energyToCharge =
        (batteryCapacity * (targetCharge - currentCharge)) / 100;
      const estimatedTime = (energyToCharge / chargingPower) * 60; // in minutes

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
