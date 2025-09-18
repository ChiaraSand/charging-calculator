"use strict";
import JsonLoader from "./utils/JsonLoader.js";
import TariffManager from "./services/TariffClasses.js";
import VehicleChargingCurves from "./services/VehicleChargingCurves.js";
import GoogleMapsManager from "./services/GoogleMapsManager.js";
import ChartManager from "./services/ChartManager.js";
import DateTimeHelper from "./utils/DateTimeHelper.js";
import DualSlider from "./components/DualSlider.js";

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
    this.vehicles = {};

    // Initialize helper classes
    this.chartManager = null; // Will be initialized after data is loaded
    this.dualSlider = null; // Will be initialized after DOM is ready

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

    this.initializeDualSlider();
    this.setupEventListeners();
    this.populatePresetSelect();
    this.populateVehicleSelect();
    this.populateProviderFilters();
    this.populateConnectorFilters();
    this.populateTariffTable();
    // this.mapsManager.setAvailableTariffs(this.tariffs);
    this.updateCalculations();
    this.chartManager.initializeChargingChart();

    // REVIEW: why is this duplicated?
    // // Update chart with current form values after initialization
    // this.chartManager.updateChargingChart({
    //   batteryCapacity:
    //     parseFloat(document.getElementById("batteryCapacity").value) || 0,
    //   currentCharge:
    //     parseFloat(document.getElementById("currentCharge").value) || 0,
    //   targetCharge:
    //     parseFloat(document.getElementById("targetCharge").value) || 0,
    //   chargingPower:
    //     parseFloat(document.getElementById("chargingPower").value) || 0,
    //   selectedVehicle: this.selectedVehicle,
    // });

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
        // inputFields,
        tariffs,
        vehicles,
      ] = await Promise.all([
        JsonLoader.loadAsset("data/presets.json"),
        JsonLoader.loadAsset("data/connectors.json"),
        JsonLoader.loadAsset("data/provider-groups.json"),
        JsonLoader.loadAsset("data/charging-powers.json"),
        // JsonLoader.loadAsset("data/input-fields.json"),
        JsonLoader.loadAsset("data/tariffs.json"),
        JsonLoader.loadAsset("data/vehicles.json"),
      ]);

      this.presets = presets;
      this.connectorData = connectorData;
      this.providerGroups = providerGroups;
      this.chargingPowers = chargingPowers;
      this.inputFields = [
        "batteryCapacity",
        "currentCharge",
        "targetCharge",
        "startTime",
        "endTime",
      ];
      this.tariffs = tariffs;
      this.vehicles = vehicles;
    } catch (error) {
      console.error("Error loading data from JSON files:", error);
    }
  }

  // Load tariff data from JSON file
  async loadTariffs() {
    try {
      const providersData = this.tariffs;

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

  populatePresetSelect() {
    const presetSelect = document.getElementById("presetSelect");
    presetSelect.innerHTML = Object.entries(this.presets)
      .map(([value, { name }]) => `<option value="${value}">${name}</option>`)
      .join("");
  }

  populateVehicleSelect() {
    const vehicleSelect = document.getElementById("quickVehicleSelect");
    vehicleSelect.innerHTML = Object.entries(this.vehicles)
      .map(([value, { name }]) => `<option value="${value}">${name}</option>`)
      .join("");
  }

  initializeDualSlider() {
    const container = document.getElementById("chargeLevelSlider");
    if (!container) return;

    this.dualSlider = new DualSlider({
      container: container,
      min: 0,
      max: 100,
      step: 1,
      currentValue: 20,
      targetValue: 80,
      unit: "%",
      label: "Ladestand",
      currentLabel: "Aktuell",
      targetLabel: "Ziel",
      onChange: (values) => {
        this.handleChargeLevelChange(values);
      },
    });
  }

  handleChargeLevelChange(values) {
    // Update the hidden form inputs for compatibility with existing code
    const currentChargeInput = document.getElementById("currentCharge");
    const targetChargeInput = document.getElementById("targetCharge");
    const currentChargeValue = document.getElementById("currentChargeValue");
    const targetChargeValue = document.getElementById("targetChargeValue");

    if (currentChargeInput) currentChargeInput.value = values.current;
    if (targetChargeInput) targetChargeInput.value = values.target;
    if (currentChargeValue)
      currentChargeValue.textContent = values.current + "%";
    if (targetChargeValue) targetChargeValue.textContent = values.target + "%";

    // Trigger calculations
    this.updateCalculations();
  }

  setupEventListeners() {
    // Form inputs
    document
      .getElementById("batteryCapacity")
      .addEventListener("input", () => this.updateCalculations());
    // Note: currentCharge and targetCharge are now handled by the dual slider
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
    // this.setupLegendToggles();
    this.chartManager?.setupLegendToggles();

    // Clear all button
    // document.getElementById("clearAll").addEventListener("click", (e) => {
    //   e.preventDefault();
    //   this.clearAllInputs(e.target.form);
    // });

    // // Provider filter buttons
    // document
    //   .getElementById("selectAllProviders")
    //   .addEventListener("click", () => this.selectAllProviders());
    // document
    //   .getElementById("selectNoProviders")
    //   .addEventListener("click", () => this.selectNoProviders());

    // // Connector filter buttons
    // document
    //   .getElementById("selectAllConnectors")
    //   .addEventListener("click", () => this.selectAllConnectors());
    // document
    //   .getElementById("selectNoConnectors")
    //   .addEventListener("click", () => this.selectNoConnectors());

    // filter buttons
    document
      .getElementById("filter-selectAll")
      .addEventListener("click", (e) =>
        this.selectAll(e.target.dataset.target)
      );
    document
      .getElementById("filter-selectNone")
      .addEventListener("click", (e) =>
        this.selectNone(e.target.dataset.target)
      );

    // Filter tabs
    document.querySelectorAll(".filter-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const tabName = e.target.dataset.tab;
        this.switchFilterTab(tabName);
      });
    });

    // Section toggle functionality
    document.querySelectorAll(".section-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        this.toggleSection(button.dataset.toggleSection);
      });
    });

    // Preconfiguration controls
    this.setupPreconfigurationEventListeners();
  }

  setupPreconfigurationEventListeners() {
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

    // Load saved preconfiguration
    document
      .getElementById("loadSavedPreconfig")
      .addEventListener("click", () => {
        this.loadSavedPreconfiguration();
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
        document.getElementById("batteryCapacity").value =
          this.vehicles[this.selectedVehicle].batteryCapacity;
        this.updateCalculations();
        // REVIEW: presetId needed instead of vehicleId (why does this work?)
        // this.handlePresetSelection(e.target.value); // REVIEW: why was this not used?
        // this.chartManager.updateChargingChart({
        //   batteryCapacity:
        //     parseFloat(document.getElementById("batteryCapacity").value) || 0,
        //   currentCharge:
        //     parseFloat(document.getElementById("currentCharge").value) || 0,
        //   targetCharge:
        //     parseFloat(document.getElementById("targetCharge").value) || 0,
        //   chargingPower: parseFloat(
        //     document.getElementById("chargingPower").value
        //   ),
        //   selectedVehicle: this.selectedVehicle,
        // });
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
    this.toggleSection("preconfig");
  }

  toggleGraphSection() {
    this.toggleSection("graph-section");
  }

  toggleSection(sectionId) {
    const content = document.getElementById(sectionId + "-content");
    // const button = document.getElementById(sectionId + "-toggle");

    if (content.classList.contains("toggle-hide")) {
      this.showSection(sectionId);
    } else {
      this.hideSection(sectionId);
    }
  }

  showSection(sectionId) {
    const content = document.getElementById(sectionId + "-content");
    const button = document.getElementById(sectionId + "-toggle");

    content.classList.remove("toggle-hide");
    button.classList.remove("expanded");
    button.innerHTML = '<i class="fas fa-chevron-up"></i> Ausblenden';
  }

  hideSection(sectionId) {
    const content = document.getElementById(sectionId + "-content");
    const button = document.getElementById(sectionId + "-toggle");

    content.classList.add("toggle-hide");
    button.classList.add("expanded");
    // NOTE: chevron is rotated 180deg by .expanded class -> equals chevron down
    button.innerHTML = '<i class="fas fa-chevron-up"></i> Einblenden';
  }

  handlePresetSelection(presetId) {
    if (!presetId) {
      return;
    }

    const preset = this.presets[presetId];
    if (!preset) {
      return;
    }

    // Apply preset values to form fields
    // document.getElementById("vehicleSelect").value = preset.vehicle;
    // document.getElementById("quickVehicleSelect").value = preset.vehicle;
    // document.getElementById("batteryCapacity").value = preset.batteryCapacity;

    // Update dual slider with preset values
    if (this.dualSlider) {
      this.dualSlider.setValues(preset.currentCharge, preset.targetCharge);
    }

    // Update hidden inputs for compatibility
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
    // this.selectedVehicle = preset.vehicle;

    // Apply tariff filter
    if (preset.tariffFilter) {
      this.applyTariffFilter(preset.tariffFilter);
    }

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

        document.getElementById("presetSelect").value = "custom";

        // Apply saved configuration
        document.getElementById("quickVehicleSelect").value = config.vehicle; // || "renault-5-e-tech-52kwh";
        document.getElementById("quickChargingPower").value =
          config.chargingPower; // || "22";
        document.getElementById("quickTariffSelect").value =
          config.tariffFilter; // || "all";

        if (config.batteryCapacity) {
          document.getElementById("batteryCapacity").value =
            config.batteryCapacity;
        }
        if (config.currentCharge && config.targetCharge) {
          // Update dual slider with saved values
          if (this.dualSlider) {
            this.dualSlider.setValues(
              config.currentCharge,
              config.targetCharge
            );
          }

          // Update hidden inputs for compatibility
          document.getElementById("currentCharge").value = config.currentCharge;
          document.getElementById("currentChargeValue").textContent =
            config.currentCharge + "%";
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

  // selectAllConnectors() {
  //   document
  //     .querySelectorAll('#connectorCheckboxes input[type="checkbox"]')
  //     .forEach((checkbox) => {
  //       checkbox.checked = true;
  //       this.selectedConnectors.add(checkbox.value);
  //     });
  //   this.populateTariffTable();
  // }

  // selectNoConnectors() {
  //   document
  //     .querySelectorAll('#connectorCheckboxes input[type="checkbox"]')
  //     .forEach((checkbox) => {
  //       checkbox.checked = false;
  //     });
  //   this.selectedConnectors.clear();
  //   this.populateTariffTable();
  // }

  selectAll(tabName) {
    document
      .getElementById(`${tabName}-tab`)
      .querySelectorAll('input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = true;
      });
  }

  selectNone(tabName) {
    document
      .getElementById(`${tabName}-tab`)
      .querySelectorAll('input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = false;
      });
  }

  switchFilterTab(tabName) {
    // Update tab buttons
    document.querySelectorAll(".filter-tab").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

    // Update target of filter buttons
    document.getElementById("filter-selectAll").dataset.target = tabName;
    document.getElementById("filter-selectNone").dataset.target = tabName;

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
      this.updateChargingSpeedInfo(chargingResult, this.selectedVehicle);
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

  /**
   * Update charging speed information display (blue box in preconfig section)
   * @param {Object} chargingResult - Result from vehicle charging curves calculation
   * @param {string} selectedVehicle - Selected vehicle ID
   */
  updateChargingSpeedInfo(chargingResult, selectedVehicle) {
    // Find or create charging speed info element
    let speedInfoElement = document.getElementById("chargingSpeedInfo");
    if (!speedInfoElement) {
      speedInfoElement = document.createElement("div");
      speedInfoElement.id = "chargingSpeedInfo";
      speedInfoElement.className = "charging-speed-info";

      // Insert into the vehicle-details element
      const parentElement = document.getElementById("vehicle-details");
      parentElement.appendChild(speedInfoElement);
    }

    const vehicle = this.vehicleCurves.vehicleData[selectedVehicle];
    const vehicleName = vehicle ? vehicle.name : "Allgemeines Fahrzeug";

    // Calculate charging speed statistics
    const chargingPowers = Object.values(vehicle.chargingCurves["400"]); // FIXME: use the actual charging power and get closest value
    const maxPower = vehicle.maxChargingPower || Math.max(...chargingPowers);
    const minPower = vehicle.minChargingPower || Math.min(...chargingPowers);

    const maxPowerSession = Math.max(...chargingResult.powerSteps);
    const minPowerSession = Math.min(...chargingResult.powerSteps);
    const avgPower = chargingResult.averagePower;

    speedInfoElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-car" style="color: #0ea5e9;"></i>
        <strong>Ladegeschwindigkeit - ${vehicleName}</strong>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; font-size: 0.8rem;">
        <div>
          <div style="color: #64748b; font-weight: 500;">Max. Leistung</div>
          <div style="font-weight: 600; color: #0ea5e9;">${vehicle.maxChargingPower.toFixed(
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
          <div style="color: #64748b; font-weight: 500;">Max. Leistung (Ladevorgang)</div>
          <div style="font-weight: 600; color: #0ea5e9;">${maxPowerSession.toFixed(
            1
          )} kW</div>
        </div>
        <div>
          <div style="color: #64748b; font-weight: 500;">Min. Leistung (Ladevorgang)</div>
          <div style="font-weight: 600; color: #0ea5e9;">${minPowerSession.toFixed(
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

  clearInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (inputId === "currentCharge" || inputId === "targetCharge") {
      // Handle charge level clearing with dual slider
      if (this.dualSlider) {
        if (inputId === "currentCharge") {
          this.dualSlider.setValues(0, this.dualSlider.getValues().target);
        } else if (inputId === "targetCharge") {
          this.dualSlider.setValues(this.dualSlider.getValues().current, 100);
        }
      }

      // Update hidden inputs for compatibility
      if (inputId === "currentCharge") {
        input.value = "0";
        document.getElementById("currentChargeValue").textContent = "0%";
      } else if (inputId === "targetCharge") {
        input.value = "100";
        document.getElementById("targetChargeValue").textContent = "100%";
      }
    } else {
      // Empty the input
      input.value = "";
    }

    // Trigger change event to update calculations
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // REVIEW: needed?
  clearAllInputs(form = null) {
    // if (form) {
    //   form.reset();
    // }

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
    const sortedProviderTariffs = this.tariffManager.sortByCost(
      filteredTariffs,
      energyToCharge,
      estimatedTime,
      blockingTime,
      startTime,
      endTime
    );
    // .map((result) => {
    //   const tariff = result.tariff;
    //   // result.name = tariff.name;
    //   // result.providerName = tariff.providerName;
    //   // Preserve the class instance and add calculated properties
    //   // result.energyCost = tariff.energyCost;
    //   // console.log("energyCost", result.energyCost);
    //   // tariff.energyCost = energyToCharge * tariff.pricePerKwh;
    //   // result.timeCost = this.calculateTimeCost(tariff, estimatedTime);
    //   // tariff.timeCost = this.calculateTimeCost(tariff, estimatedTime);
    //   // tariff.blockingFeeString =
    //   // result.pricePerKwh = tariff.pricePerKwh;
    //   // const blockingFeePerMin = this.getBlockingFeeForTariff(tariff);
    //   // tariff.blockingFee = tariff.blockingFee; // ? blockingTime * blockingFeePerMin : 0;
    //   // tariff.totalCost = result.totalCost;
    //   // tariff.effectivePricePerKwh = result.effectivePricePerKwh;
    //   // result.tariff = tariff;
    //   return result;
    // });

    // REVIEW: unused
    // // Calculate custom tariff separately (for display purposes only)
    // const customTariff = this.calculateCustomTariff(
    //   energyToCharge,
    //   estimatedTime,
    //   blockingTime
    // );

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
                <td class="price">
                  <span class="price-value">
                    ${tariff.pricePerKwh.toFixed(2)}
                  </span>
                  <span class="price-unit">€/kWh</span>
                </td>
                <td class="price">
                  <span class="price-value">
                   ${tariff.blockingFeeString}
                  </span>
                </td>
                <td class="price">
                  <span class="price-value">
                    ${tariff.energyCost.toFixed(2)}
                  </span>
                  <span class="price-unit">€</span>
                </td>
                <td class="price ${tariff.blockingFee ? "price-bad" : ""}">
                    ${
                      tariff.blockingFee
                        ? "<span class='price-value'>" +
                          tariff.blockingFee.toFixed(2) +
                          "</span>" +
                          " <span class='price-unit'>€</span>"
                        : "-"
                    }
                </td>
                <td class="total-cost">
                  <span class="price-value">
                    ${tariff.totalCost.toFixed(2)}
                  </span>
                  <span class="price-unit">€</span>
                  <br/>
                  <small class="effective-price">
                    <span class="price-value">
                      ${tariff.effectivePricePerKwh.toFixed(2)}
                    </span>
                    <span class="price-unit">€/kWh</span>
                  </small>
                </td>
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
    // const customBaseFee =
    //   parseFloat(document.getElementById("custom-base-fee")?.value) || 0.0;
    const customBlockingFee = parseFloat(
      document.getElementById("custom-blocking-fee")?.value
    );
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
    let blockingFeeCost = 0;

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
      // REVIEW: unused
      const estimatedTime = chargingResult.totalTime; // in minutes
      const totalParkingTime = DateTimeHelper.calculateTimeDifference(
        startTime,
        endTime
      );
      const blockingTime = Math.max(0, totalParkingTime);

      // Calculate total cost (matching calculateCustomTariff logic)
      const energyCost = energyToCharge * customPricePerKwh;
      const timeCost = 0; // Custom tariff doesn't have pricePerMin, so timeCost is always 0

      blockingFeeCost = blockingTime * customBlockingFee;
      totalCost = energyCost + timeCost + blockingFeeCost; // + customBaseFee
      effectivePricePerKwh =
        energyToCharge > 0 ? totalCost / energyToCharge : 0;
    }

    // Update price per selected kWh
    const pricePerSelectedKwhElement = document.getElementById(
      "custom-price-per-selected-kwh-value"
    );
    if (pricePerSelectedKwhElement) {
      pricePerSelectedKwhElement.textContent = `${pricePerSelectedKwh.toFixed(
        2
      )}`;
    }

    // Update blocking fee cost
    const blockingFeeCostElement = document.getElementById(
      "custom-blocking-fee-cost-value"
    );
    if (blockingFeeCostElement) {
      blockingFeeCostElement.textContent = `${blockingFeeCost.toFixed(2)}`;
    }

    // Update total cost
    const totalCostElement = document.getElementById("custom-total-cost-value");
    if (totalCostElement) {
      totalCostElement.textContent = `${totalCost.toFixed(2)}`;
    }

    // Update effective price per kWh
    const effectivePriceElement = document.getElementById(
      "custom-effective-price-value"
    );
    if (effectivePriceElement) {
      effectivePriceElement.textContent = `${effectivePricePerKwh.toFixed(2)}`;
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

    const customBlockingFee = 0.02;
    const initialBlockingFee = energyToCharge * customBlockingFee;

    return `
      <tr class="custom-tariff-row" style="background-color: #f0f9ff; border-bottom: 2px solid var(--primary-color);">
        <td class="provider-name" style="font-weight: 600; color: var(--primary-color);">
          <div class="provider-info">
            <strong><i class="fas fa-edit"></i> Eigener Tarif</strong>
            <br><small class="tariff-name" style="color: var(--text-secondary);">Vergleichstarif</small>
          </div>
        </td>
        <td class="price">
          <input type="number" class="custom-tariff-input" id="custom-price-per-kwh"
                 value="${customPricePerKwh.toFixed(2)}" min="0" step="0.01"
                 title="Preis pro kWh"
                 >
          <span class="price-unit">€/kWh</span>
        </td>
        <td class="price">
          <input type="number" class="custom-tariff-input" id="custom-blocking-fee"
                 value="${customBlockingFee}" min="0" step="0.01"
                 title="Blocking Fee pro Minute"
                 >
          <span class="price-unit">€/min</span>
        </td>
        <td class="price" id="custom-price-per-selected-kwh">
          <span class="price-value" id="custom-price-per-selected-kwh-value">
            ${initialEnergyCost.toFixed(2)}
          </span>
          <span class="price-unit">€</span>
        </td>
        <td class="price ${
          initialBlockingFee > 0 ? "price-bad" : ""
        }" id="custom-blocking-fee-cost">
          <span class="price-value" id="custom-blocking-fee-cost-value">
            ${initialBlockingFee.toFixed(2)}
          </span>
          <span class="price-unit">€</span>
        </td>
        <td class="total-cost" id="custom-total-cost">
          <span>
            <span class="price-value" id="custom-total-cost-value">
              —
            </span>
            <span class="price-unit">€</span>
          </span>
          <br/>
          <small class="effective-price" id="custom-effective-price">
            <span class="price-value" id="custom-effective-price-value">
              —
            </span>
            <span class="price-unit">€/kWh</span>
          </small>
        </td>
      </tr>
    `;
  }

  getCustomTariffData() {
    return {
      name: "Eigener Tarif",
      providerName: "Eigener Tarif",
      type: "AC/DC",
      pricePerKwh: parseFloat(
        document.getElementById("custom-price-per-kwh")?.value
      ),
      pricePerMin: parseFloat(
        document.getElementById("custom-blocking-fee")?.value
      ),
      // baseFee:
      //   parseFloat(document.getElementById("custom-base-fee")?.value) || 0.0,
      blockingFee: parseFloat(
        document.getElementById("custom-blocking-fee")?.value
      ),
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

export default ChargingCalculator;
