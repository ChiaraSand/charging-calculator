class ChargingCalculator {
  constructor() {
    this.tariffManager = new TariffManager();
    this.tariffs = [];
    this.selectedProviders = new Set();
    this.selectedConnectors = new Set();
    this.vehicleCurves = new VehicleChargingCurves();
    this.selectedVehicle = "renault-5-e-tech-52kwh"; // Default vehicle

    this.mapsManager = new GoogleMapsManager(true); // false to disable map

    // Data will be loaded from JSON files
    this.presets = {};
    this.connectorData = {};
    this.providerGroups = {};
    this.chargingPowers = [];
    this.inputFields = [];

    // Initialize helper classes
    this.chartManager = null; // Will be initialized after data is loaded

    this.init();
  }

  async init() {
    const startTimeString = DateTimeHelper.getCurrentTimeString("de-DE");
    document.getElementById("startTime").value = startTimeString;

    // Load data from JSON files first
    await this.loadDataFromJson();

    await this.loadTariffs();

    // Initialize chart manager after data is loaded
    this.chartManager = new ChartManager(
      this.vehicleCurves,
      this.chargingPowers
    );

    this.setupEventListeners();
    this.populateProviderFilters();
    this.populateConnectorFilters();
    this.populateTariffTable();
    // this.mapsManager.setAvailableTariffs(this.tariffs);
    this.updateCalculations();
    this.chartManager.initializeChargingChart();

    // Update chart with current form values after initialization
    this.chartManager.updateChargingChart({
      batteryCapacity:
        parseFloat(document.getElementById("batteryCapacity").value) || 0,
      currentCharge:
        parseFloat(document.getElementById("currentCharge").value) || 0,
      targetCharge:
        parseFloat(document.getElementById("targetCharge").value) || 0,
      chargingPower:
        parseFloat(document.getElementById("chargingPower").value) || 0,
      selectedVehicle: this.selectedVehicle,
    });

    await this.mapsManager.initializeMap("map");

    // Load saved preconfiguration after everything is initialized
    this.loadSavedPreconfiguration();

    // Final chart update to ensure it shows the correct data
    this.chartManager.updateChargingChart({
      batteryCapacity:
        parseFloat(document.getElementById("batteryCapacity").value) || 0,
      currentCharge:
        parseFloat(document.getElementById("currentCharge").value) || 0,
      targetCharge:
        parseFloat(document.getElementById("targetCharge").value) || 0,
      chargingPower:
        parseFloat(document.getElementById("chargingPower").value) || 0,
      selectedVehicle: this.selectedVehicle,
    });
  }

  async loadDataFromJson() {
    try {
      // Load all JSON data files
      const [
        presets,
        connectorData,
        providerGroups,
        chargingPowers,
        inputFields,
      ] = await Promise.all([
        fetch("./data/presets.json").then((r) => r.json()),
        fetch("./data/connectors.json").then((r) => r.json()),
        fetch("./data/provider-groups.json").then((r) => r.json()),
        fetch("./data/charging-powers.json").then((r) => r.json()),
        fetch("./data/input-fields.json").then((r) => r.json()),
      ]);

      this.presets = presets;
      this.connectorData = connectorData;
      this.providerGroups = providerGroups;
      this.chargingPowers = chargingPowers;
      this.inputFields = inputFields;
    } catch (error) {
      console.error("Error loading data from JSON files:", error);
      // Fallback to hardcoded data if JSON loading fails
      // this.loadFallbackData();
    }
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
    document.getElementById("chargingPower").addEventListener("change", (e) => {
      document.getElementById("quickChargingPower").value = e.target.value;
      this.updateCalculations();
    });
    // document.getElementById("vehicleSelect").addEventListener("change", (e) => {
    //   this.selectedVehicle = e.target.value;
    //   this.updateCalculations();
    //   this.updateChargingChart();
    // });
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

    // Preconfiguration controls
    this.setupPreconfigurationEventListeners();
  }

  setupPreconfigurationEventListeners() {
    // Toggle preconfiguration section
    document.getElementById("togglePreconfig").addEventListener("click", () => {
      this.togglePreconfiguration();
    });

    // Preset selection
    document.getElementById("presetSelect").addEventListener("change", (e) => {
      this.handlePresetSelection(e.target.value);
    });

    // Apply preconfiguration
    document.getElementById("applyPreconfig").addEventListener("click", () => {
      this.applyPreconfiguration();
    });

    // Save preconfiguration
    document.getElementById("savePreconfig").addEventListener("click", () => {
      this.savePreconfiguration();
    });

    // Reset preconfiguration
    document.getElementById("resetPreconfig").addEventListener("click", () => {
      this.resetPreconfiguration();
    });

    // Quick vehicle selection
    document
      .getElementById("quickVehicleSelect")
      .addEventListener("change", (e) => {
        this.selectedVehicle = e.target.value;
        this.updateCalculations();
        this.chartManager.updateChargingChart({
          batteryCapacity:
            parseFloat(document.getElementById("batteryCapacity").value) || 0,
          currentCharge:
            parseFloat(document.getElementById("currentCharge").value) || 0,
          targetCharge:
            parseFloat(document.getElementById("targetCharge").value) || 0,
          chargingPower:
            parseFloat(document.getElementById("chargingPower").value) || 0,
          selectedVehicle: this.selectedVehicle,
        });
      });

    // Quick charging power selection
    document
      .getElementById("quickChargingPower")
      .addEventListener("change", (e) => {
        document.getElementById("chargingPower").value = e.target.value;
        this.updateCalculations();
      });

    // Quick tariff selection
    document
      .getElementById("quickTariffSelect")
      .addEventListener("change", (e) => {
        this.applyTariffFilter(e.target.value);
      });
  }

  togglePreconfiguration() {
    const content = document.getElementById("preconfigContent");
    const button = document.getElementById("togglePreconfig");

    if (content.classList.contains("show")) {
      // content.style.display = "none";
      content.classList.remove("show");
      button.classList.remove("expanded");
      button.innerHTML = '<i class="fas fa-chevron-down"></i> Einblenden';
    } else {
      // content.style.display = "flex";
      content.classList.add("show");
      button.classList.add("expanded");
      // chevron is rotated 180deg by .expanded class
      button.innerHTML = '<i class="fas fa-chevron-down"></i> Ausblenden';
      // button.innerHTML = '<i class="fas fa-chevron-up"></i> Ausblenden';
    }
  }

  handlePresetSelection(presetId) {
    if (!presetId || presetId === "custom") {
      return;
    }

    const preset = this.presets[presetId];
    if (!preset) {
      return;
    }

    // Apply preset values to form fields
    // document.getElementById("vehicleSelect").value = preset.vehicle;
    document.getElementById("quickVehicleSelect").value = preset.vehicle;
    document.getElementById("batteryCapacity").value = preset.batteryCapacity;
    document.getElementById("currentCharge").value = preset.currentCharge;
    document.getElementById("currentChargeValue").textContent =
      preset.currentCharge + "%";
    document.getElementById("targetCharge").value = preset.targetCharge;
    document.getElementById("targetChargeValue").textContent =
      preset.targetCharge + "%";
    document.getElementById("chargingPower").value = preset.chargingPower;
    document.getElementById("quickChargingPower").value = preset.chargingPower;
    document.getElementById("quickTariffSelect").value = preset.tariffFilter;

    // Update selected vehicle
    this.selectedVehicle = preset.vehicle;

    // Apply tariff filter
    this.applyTariffFilter(preset.tariffFilter);

    // Update calculations
    this.updateCalculations();
    this.chartManager.updateChargingChart({
      batteryCapacity:
        parseFloat(document.getElementById("batteryCapacity").value) || 0,
      currentCharge:
        parseFloat(document.getElementById("currentCharge").value) || 0,
      targetCharge:
        parseFloat(document.getElementById("targetCharge").value) || 0,
      chargingPower:
        parseFloat(document.getElementById("chargingPower").value) || 0,
      selectedVehicle: this.selectedVehicle,
    });

    // Show success message
    this.showPreconfigMessage("Vorkonfiguration angewendet!", "success");
  }

  applyPreconfiguration() {
    const vehicle = document.getElementById("quickVehicleSelect").value;
    const chargingPower = document.getElementById("quickChargingPower").value;
    const tariffFilter = document.getElementById("quickTariffSelect").value;

    // Apply to main form
    // document.getElementById("vehicleSelect").value = vehicle;
    document.getElementById("chargingPower").value = chargingPower;

    // Update selected vehicle
    this.selectedVehicle = vehicle;

    // Apply tariff filter
    this.applyTariffFilter(tariffFilter);

    // Update calculations
    this.updateCalculations();
    this.chartManager.updateChargingChart({
      batteryCapacity:
        parseFloat(document.getElementById("batteryCapacity").value) || 0,
      currentCharge:
        parseFloat(document.getElementById("currentCharge").value) || 0,
      targetCharge:
        parseFloat(document.getElementById("targetCharge").value) || 0,
      chargingPower:
        parseFloat(document.getElementById("chargingPower").value) || 0,
      selectedVehicle: this.selectedVehicle,
    });

    this.showPreconfigMessage("Konfiguration angewendet!", "success");
  }

  savePreconfiguration() {
    const config = {
      vehicle: document.getElementById("quickVehicleSelect").value,
      chargingPower: document.getElementById("quickChargingPower").value,
      tariffFilter: document.getElementById("quickTariffSelect").value,
      batteryCapacity: document.getElementById("batteryCapacity").value,
      currentCharge: document.getElementById("currentCharge").value,
      targetCharge: document.getElementById("targetCharge").value,
    };

    // Save to localStorage
    localStorage.setItem("chargingCalculatorPreconfig", JSON.stringify(config));
    this.showPreconfigMessage("Voreinstellung gespeichert!", "success");
  }

  resetPreconfiguration() {
    // Reset all preconfiguration fields
    document.getElementById("presetSelect").value = "";
    document.getElementById("quickVehicleSelect").value =
      "renault-5-e-tech-52kwh";
    document.getElementById("quickChargingPower").value = "22";
    document.getElementById("quickTariffSelect").value = "all";

    // Clear saved configuration
    localStorage.removeItem("chargingCalculatorPreconfig");

    this.showPreconfigMessage("Voreinstellungen zurückgesetzt!", "info");
  }

  applyTariffFilter(filterType) {
    switch (filterType) {
      case "cheapest":
        // Select only the cheapest providers
        this.selectCheapestProviders();
        break;
      case "premium":
        // Select premium providers like Ionity
        this.selectPremiumProviders();
        break;
      case "local":
        // Select local providers
        this.selectLocalProviders();
        break;
      case "all":
        // Select all providers
        this.selectAllProviders();
        break;
      case "custom":
        // Don't change selection, let user choose manually
        break;
    }
  }

  selectCheapestProviders() {
    // Get all providers and sort by average price
    const providers = this.tariffManager.getUniqueProviders();
    const providerPrices = providers.map((provider) => {
      const providerTariffs = this.tariffs.filter(
        (t) => t.providerName === provider
      );
      const avgPrice =
        providerTariffs.reduce((sum, t) => sum + t.pricePerKwh, 0) /
        providerTariffs.length;
      return { provider, avgPrice };
    });

    // Select the 3 cheapest providers
    const cheapestProviders = providerPrices
      .sort((a, b) => a.avgPrice - b.avgPrice)
      .slice(0, 3)
      .map((p) => p.provider);

    // Update checkboxes
    document
      .querySelectorAll('#providerCheckboxes input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = cheapestProviders.includes(checkbox.value);
        if (checkbox.checked) {
          this.selectedProviders.add(checkbox.value);
        } else {
          this.selectedProviders.delete(checkbox.value);
        }
      });

    this.populateTariffTable();
  }

  selectPremiumProviders() {
    const premiumProviders = this.providerGroups.premiumProviders || [
      "Ionity",
      "Tesla",
    ];

    document
      .querySelectorAll('#providerCheckboxes input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = premiumProviders.includes(checkbox.value);
        if (checkbox.checked) {
          this.selectedProviders.add(checkbox.value);
        } else {
          this.selectedProviders.delete(checkbox.value);
        }
      });

    this.populateTariffTable();
  }

  selectLocalProviders() {
    const localProviders = this.providerGroups.localProviders || [
      "EWE Go",
      "Qwello NRW",
    ];

    document
      .querySelectorAll('#providerCheckboxes input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = localProviders.includes(checkbox.value);
        if (checkbox.checked) {
          this.selectedProviders.add(checkbox.value);
        } else {
          this.selectedProviders.delete(checkbox.value);
        }
      });

    this.populateTariffTable();
  }

  showPreconfigMessage(message, type = "info") {
    // Create or update message element
    let messageElement = document.getElementById("preconfigMessage");
    if (!messageElement) {
      messageElement = document.createElement("div");
      messageElement.id = "preconfigMessage";
      messageElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 1000;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `;
      document.body.appendChild(messageElement);
    }

    // Set message content and styling based on type
    messageElement.textContent = message;
    switch (type) {
      case "success":
        messageElement.style.background = "#10b981";
        messageElement.style.color = "white";
        break;
      case "error":
        messageElement.style.background = "#ef4444";
        messageElement.style.color = "white";
        break;
      case "info":
      default:
        messageElement.style.background = "#3b82f6";
        messageElement.style.color = "white";
        break;
    }

    // Show message
    messageElement.style.opacity = "1";
    messageElement.style.transform = "translateX(0)";

    // Hide message after 3 seconds
    setTimeout(() => {
      messageElement.style.opacity = "0";
      messageElement.style.transform = "translateX(100%)";
    }, 3000);
  }

  loadSavedPreconfiguration() {
    const saved = localStorage.getItem("chargingCalculatorPreconfig");
    if (saved) {
      try {
        const config = JSON.parse(saved);

        // Apply saved configuration
        document.getElementById("quickVehicleSelect").value =
          config.vehicle || "renault-5-e-tech-52kwh";
        document.getElementById("quickChargingPower").value =
          config.chargingPower || "22";
        document.getElementById("quickTariffSelect").value =
          config.tariffFilter || "all";

        if (config.batteryCapacity) {
          document.getElementById("batteryCapacity").value =
            config.batteryCapacity;
        }
        if (config.currentCharge) {
          document.getElementById("currentCharge").value = config.currentCharge;
          document.getElementById("currentChargeValue").textContent =
            config.currentCharge + "%";
        }
        if (config.targetCharge) {
          document.getElementById("targetCharge").value = config.targetCharge;
          document.getElementById("targetChargeValue").textContent =
            config.targetCharge + "%";
        }

        // Apply the configuration
        this.applyPreconfiguration();
      } catch (error) {
        console.error("Error loading saved preconfiguration:", error);
      }
    }
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

    // Use loaded connector data or fallback
    const connectorTypes = this.connectorData.connectors || [];

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
        totalParkingTime = DateTimeHelper.calculateTimeDifference(
          startTime,
          endTime
        );
      } else {
        totalParkingTime = estimatedTime;
      }

      const totalParkingTimeString =
        DateTimeHelper.formatDuration(totalParkingTime);

      document.getElementById(
        "energyToCharge"
      ).textContent = `${energyToCharge.toFixed(1)} kWh`;

      const estimatedTimeString = DateTimeHelper.formatDuration(estimatedTime);
      document.getElementById("estimatedTime").textContent =
        estimatedTimeString;
      document.getElementById("totalParkingTime").textContent =
        totalParkingTimeString;

      // Update charging speed information
      this.chartManager.updateChargingSpeedInfo(
        chargingResult,
        this.selectedVehicle
      );
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
    const inputsToClear =
      this.inputFields.length > 0
        ? this.inputFields
        : [
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

    // Use vehicle-specific charging curves for accurate time calculation
    const chargingResult = this.vehicleCurves.calculateChargingTime(
      this.selectedVehicle,
      currentCharge,
      targetCharge,
      chargingPower,
      batteryCapacity
    );
    const estimatedTime = chargingResult.totalTime; // in minutes
    let totalParkingTime = 0;
    if (endTime) {
      totalParkingTime = DateTimeHelper.calculateTimeDifference(
        startTime,
        endTime
      );
    } else {
      // Fix: If endTime is not set, use estimatedTime as totalParkingTime (in minutes)
      totalParkingTime = estimatedTime;
    }

    // Filter tariffs based on selected providers and connectors
    const filteredTariffs = this.tariffManager.getFilteredTariffs({
      providers: Array.from(this.selectedProviders),
      connectors: Array.from(this.selectedConnectors),
    });

    const endTimeMinutes =
      DateTimeHelper.timeToMinutes(startTime) + totalParkingTime;
    const endTimeDate = DateTimeHelper.minutesToTime(endTimeMinutes);

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

    // REVIEW: unused
    // Calculate custom tariff separately (for display purposes only)
    const customTariff = this.calculateCustomTariff(
      energyToCharge,
      estimatedTime,
      blockingTime
    );

    // Sort provider tariffs only (custom tariff has its own input row)
    const sortedTariffs = sortedProviderTariffs.sort(
      (a, b) => a.totalCost - b.totalCost
    );

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

    // Set up event listeners for custom tariff inputs
    this.setupCustomTariffEventListeners();

    // Update custom tariff display
    this.updateCustomTariffDisplay(energyToCharge);

    // Update header with actual energy amount
    this.updatePricePerSelectedKwhHeader(energyToCharge);

    // Update charging chart
    this.chartManager.updateChargingChart({
      batteryCapacity,
      currentCharge,
      targetCharge,
      chargingPower,
      selectedVehicle: this.selectedVehicle,
    });
  }

  setupCustomTariffEventListeners() {
    // Add event listeners to custom tariff inputs
    document.querySelectorAll(".custom-tariff-input").forEach((input) => {
      // Remove any existing event listeners by cloning
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);

      // Add the event listener to the new element
      newInput.addEventListener("input", (e) => {
        this.updateCustomTariffOnInput();
      });
    });
  }

  updateCustomTariffOnInput() {
    // Update only the custom tariff display without recreating the entire table
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

  // setupBlockingFeeInputs() {
  //   // This function is kept for backward compatibility but now just calls the new function
  //   this.setupCustomTariffEventListeners();
  // }

  updateCustomTariffDisplay(energyToCharge) {
    const customPricePerKwh =
      parseFloat(document.getElementById("custom-price-per-kwh")?.value) || 0.5;
    const customBaseFee =
      parseFloat(document.getElementById("custom-base-fee")?.value) || 0.0;
    console.debug(
      "custom-blocking-fee",
      document.getElementById("custom-blocking-fee")?.value,
      parseFloat(document.getElementById("custom-blocking-fee")?.value)
    );
    const customBlockingFee = parseFloat(
      document.getElementById("custom-blocking-fee")?.value
    ); // || 0.1;
    console.debug("customBlockingFee", customBlockingFee);
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
      // Use vehicle-specific charging curves for accurate time calculation
      const chargingResult = this.vehicleCurves.calculateChargingTime(
        this.selectedVehicle,
        currentCharge,
        targetCharge,
        chargingPower,
        batteryCapacity
      );
      const estimatedTime = chargingResult.totalTime; // in minutes
      const totalParkingTime = DateTimeHelper.calculateTimeDifference(
        startTime,
        endTime
      );
      const blockingTime = Math.max(0, totalParkingTime);

      // Calculate total cost (matching calculateCustomTariff logic)
      const energyCost = energyToCharge * customPricePerKwh;
      const timeCost = 0; // Custom tariff doesn't have pricePerMin, so timeCost is always 0

      const blockingFeeCost = blockingTime * customBlockingFee;
      console.debug("blockingTime", blockingTime);
      console.debug("customBlockingFee", customBlockingFee);
      console.debug("blockingFeeCost", blockingFeeCost);
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
        parseFloat(document.getElementById("custom-blocking-fee")?.value) ||
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

  // REVIEW: unused
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
    const connectorMapping = this.connectorData.chargingTypeMapping || {
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

  /**
   * Setup legend toggle functionality
   */
  setupLegendToggles() {
    if (this.chartManager) {
      this.chartManager.setupLegendToggles();
    }
  }

  /**
   * Toggle a specific dataset visibility
   * @param {number} datasetIndex - Index of the dataset to toggle
   */
  toggleDataset(datasetIndex) {
    if (this.chartManager) {
      this.chartManager.toggleDataset(datasetIndex);
    }
  }

  /**
   * Show all datasets
   */
  showAllDatasets() {
    if (this.chartManager) {
      this.chartManager.showAllDatasets();
    }
  }

  /**
   * Hide all datasets except the first two (realistic and linear)
   */
  hideAllDatasets() {
    if (this.chartManager) {
      this.chartManager.hideAllDatasets();
    }
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

// loadFallbackData() {
//   // Fallback data in case JSON loading fails
//   this.presets = {
//     "renault-5-daily": {
//       vehicle: "renault-5-e-tech-52kwh",
//       batteryCapacity: 52,
//       currentCharge: 20,
//       targetCharge: 80,
//       chargingPower: 22,
//       tariffFilter: "cheapest",
//     },
//     "renault-5-trip": {
//       vehicle: "renault-5-e-tech-52kwh",
//       batteryCapacity: 52,
//       currentCharge: 10,
//       targetCharge: 90,
//       chargingPower: 150,
//       tariffFilter: "premium",
//     },
//     "generic-daily": {
//       vehicle: "generic",
//       batteryCapacity: 50,
//       currentCharge: 20,
//       targetCharge: 80,
//       chargingPower: 11,
//       tariffFilter: "cheapest",
//     },
//     "generic-trip": {
//       vehicle: "generic",
//       batteryCapacity: 60,
//       currentCharge: 10,
//       targetCharge: 90,
//       chargingPower: 150,
//       tariffFilter: "premium",
//     },
//   };
//   this.connectorData = {
//     connectors: [
//       {
//         id: "TYPE_1",
//         name: "Type 1 (J1772)",
//         description: "AC-Ladung, hauptsächlich in Nordamerika",
//         chargingType: "AC",
//         aliases: ["J1772", "IEC_62196_T1"],
//       },
//       {
//         id: "TYPE_2",
//         name: "Type 2 (Mennekes)",
//         description: "AC-Ladung, Standard in Europa",
//         chargingType: "AC",
//         aliases: ["MENNEKES", "IEC_62196_T2"],
//       },
//       {
//         id: "CCS_1",
//         name: "CCS 1",
//         description: "DC-Schnellladung, Nordamerika",
//         chargingType: "DC",
//         aliases: ["IEC_62196_T1_COMBO"],
//       },
//       {
//         id: "CCS_2",
//         name: "CCS 2",
//         description: "DC-Schnellladung, Europa",
//         chargingType: "DC",
//         aliases: ["IEC_62196_T2_COMBO"],
//       },
//       {
//         id: "CHAdeMO",
//         name: "CHAdeMO",
//         description: "DC-Schnellladung, hauptsächlich Japan",
//         chargingType: "DC",
//         aliases: [],
//       },
//       {
//         id: "TESLA",
//         name: "Tesla Supercharger",
//         description: "Tesla-eigene DC-Schnellladung",
//         chargingType: "DC",
//         aliases: [],
//       },
//       {
//         id: "SCHUKO",
//         name: "Schuko",
//         description: "Haushaltssteckdose, AC-Ladung",
//         chargingType: "AC",
//         aliases: [],
//       },
//     ],
//     chargingTypeMapping: {
//       AC: ["TYPE_1", "TYPE_2", "SCHUKO"],
//       DC: ["CCS_1", "CCS_2", "CHAdeMO", "TESLA"],
//     },
//     enumValues: {
//       TYPE_1: "TYPE_1",
//       TYPE_2: "TYPE_2",
//       CCS_1: "CCS_1",
//       CCS_2: "CCS_2",
//       CHADEMO: "CHAdeMO",
//       TESLA: "TESLA",
//       SCHUKO: "SCHUKO",
//     },
//   };
//   this.providerGroups = {
//     premiumProviders: ["Ionity", "Tesla"],
//     localProviders: ["EWE Go", "Qwello NRW"],
//   };
//   this.chargingPowers = [400, 300, 150, 50, 22, 11];
//   this.inputFields = [
//     "batteryCapacity",
//     "currentCharge",
//     "targetCharge",
//     "startTime",
//     "endTime",
//   ];
// }
