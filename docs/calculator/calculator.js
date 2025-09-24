"use strict";
import JsonLoader from "./utils/JsonLoader.js";
import TariffManager from "./services/TariffClasses.js";
import VehicleChargingCurves from "./services/VehicleChargingCurves.js";
import GoogleMapsManager from "./services/GoogleMapsManager.js";
import ChartManager from "./services/ChartManager.js";
import DateTimeHelper from "./utils/DateTimeHelper.js";
import DualSlider from "./components/DualSlider.js";
import CustomDate from "./utils/CustomDate.js";
import ViewHelper from "./utils/ViewHelper.js";
import VehicleDetails from "./components/VehicleDetails.js";

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

    // this.formValues = {
    //   batteryCapacity: 0,
    //   currentCharge: 0,
    //   targetCharge: 0,
    //   chargingPower: 0,
    //   startTime: new CustomDate().getDatePickerString(),
    //   endTime: "",
    // };
    this.formValues = {}; // Will be initialized after DOM is ready
    this.calculatedValues = {}; // Will be initialized after DOM is ready

    this.init();
  }

  async init() {
    this.inputFields = [
      "batteryCapacity",
      "chargeLevelSlider-value-start",
      "chargeLevelSlider-value-end",
      "calculator-input-startDate",
      "calculator-input-endDate",
    ];

    this.tariffFilterOptions = [
      { value: "all", label: "Alle Tarife" },
      { value: "cheapest", label: "Nur günstigste Tarife" },
      { value: "premium", label: "Premium Tarife (Ionity, etc.)" },
      { value: "local", label: "Lokale Anbieter" },
      { value: "custom", label: "Eigene Auswahl" },
    ];

    this.setDateTimeInputNow("calculator-input-startDate");

    // Load data from JSON files first
    await this.loadDataFromJson();

    await this.loadTariffs();
    await this.mapsManager.initializeMap();

    this.initializeDualSlider();
    this.populateChargingPowerSelect();
    this.populateQuickChargingPowerSelect();
    this.populateQuickTariffSelect();
    ViewHelper.populateSelect(
      "presetSelect",
      Object.entries(this.presets).map(([value, { name }]) => [value, name])
    );
    ViewHelper.populateSelect(
      "quickVehicleSelect",
      Object.entries(this.vehicles).map(([value, { name }]) => [value, name])
    );
    this.populateProviderFilters();
    this.populateConnectorFilters();

    // Load saved preconfiguration after everything is initialized
    this.loadSavedPreconfiguration();

    // Initialize chart manager after data is loaded
    this.chartManager = new ChartManager(
      this.vehicleCurves,
      this.chargingPowers
    );

    this.setupEventListeners();

    this.fetchFormValuesFromDOM();

    this.updateCalculations();
    this.chartManager.initializeChargingChart();

    this.fetchFormValuesFromDOM();

    // Final chart update to ensure it shows the correct data
    this.chartManager.updateChargingChart({
      ...this.formValues,
      selectedVehicle: this.selectedVehicle,
    });
  }

  async loadDataFromJson() {
    try {
      // Load all JSON data files
      const [presets, connectorData, chargingPowers, tariffs, vehicles] =
        await Promise.all([
          JsonLoader.loadAsset("data/presets.json"),
          JsonLoader.loadAsset("data/connectors.json"),
          JsonLoader.loadAsset("data/charging-powers.json"),
          JsonLoader.loadAsset("data/tariffs.json"),
          JsonLoader.loadAsset("data/vehicles.json"),
        ]);

      this.presets = presets;
      this.connectorData = connectorData;
      // this.providerGroups = providerGroups;
      this.chargingPowers = chargingPowers;
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

  populateChargingPowerSelect() {
    const chargingPowerSelect = document.getElementById("chargingPowerSelect");
    chargingPowerSelect.innerHTML = this.chargingPowers
      .sort((a, b) => a.value - b.value)
      .map(
        (power) =>
          `<option value="${power.value}" data-charging-type="${power.chargingType}">${power.description}</option>`
      )
      .join("");
  }

  populateQuickChargingPowerSelect() {
    const quickChargingPowerSelect = document.getElementById(
      "quickChargingPowerSelect"
    );
    quickChargingPowerSelect.innerHTML = this.chargingPowers
      .sort((a, b) => a.value - b.value)
      .map(
        (power) =>
          `<option value="${power.value}">${power.description}</option>`
      )
      .join("");
  }

  populateQuickTariffSelect() {
    const quickTariffSelect = document.getElementById("quickTariffSelect");
    quickTariffSelect.innerHTML = this.tariffFilterOptions
      .map(
        (option) => `<option value="${option.value}">${option.label}</option>`
      )
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
      onChange: () => {
        this.updateCalculations();
      },
    });
  }

  fetchFormValuesFromDOM() {
    const chargingPowerSelect = document.getElementById("chargingPowerSelect");
    const chargingType =
      chargingPowerSelect.options[chargingPowerSelect.selectedIndex].dataset
        .chargingType; // || "DC";

    this.formValues = {
      batteryCapacity: parseFloat(
        document.getElementById("batteryCapacity").value
      ), // || 0,
      currentCharge: parseFloat(
        document.getElementById("chargeLevelSlider-value-start").value
      ), // || 0,
      targetCharge: parseFloat(
        document.getElementById("chargeLevelSlider-value-end").value
      ), // || 0,
      chargingPower: parseFloat(chargingPowerSelect.value), // || 0,
      chargingType: chargingType,
      startTime: document.getElementById("calculator-input-startDate").value,
      endTime: document.getElementById("calculator-input-endDate").value,
    };

    return this.formValues;
  }

  setupEventListeners() {
    // Form inputs
    document
      .querySelectorAll(".trigger-update-calculation")
      .forEach((element) => {
        element.addEventListener("change", () => this.updateCalculations());
      });

    // Connect charging power select to quick charging power select
    document
      .getElementById("chargingPowerSelect")
      .addEventListener("change", (e) => {
        document.getElementById("quickChargingPowerSelect").value =
          e.target.value;
      });

    // Clear buttons
    document.querySelectorAll(".clear-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const targetId = e.target.closest(".clear-btn").dataset.target;
        this.clearInput(targetId);
      });
    });

    // Date time input now buttons
    document.querySelectorAll(".dateTime-input-now").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (e.target.dataset.target) {
          this.setDateTimeInputNow(e.target.dataset.target);
        } else {
          console.warn(
            "no target defined. Try clickung the button background (not the button text or icon)"
          );
        }
      });
    });

    // Clear all button
    // document.getElementById("clearAll").addEventListener("click", (e) => {
    //   e.preventDefault();
    //   this.clearAllInputs(e.target.form);
    // });

    // filter buttons
    document.querySelectorAll(".btn-select-all").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        ViewHelper.selectAllCheckboxes(e.target.dataset.target)
      );
    });
    document.querySelectorAll(".btn-deselect-all").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        ViewHelper.deselectAllCheckboxes(e.target.dataset.target)
      );
    });

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
        ViewHelper.toggleSection(button.dataset.toggleSection);
      });
    });

    // Preconfiguration controls
    this.setupPreconfigurationEventListeners();
  }

  setDateTimeInputNow(targetId) {
    const input = document.getElementById(targetId);
    input.value = DateTimeHelper.getCurrentDateTimeString("de-DE");
  }

  setupPreconfigurationEventListeners() {
    // Preset selection
    document.getElementById("presetSelect").addEventListener("change", (e) => {
      this.handlePresetSelection(e.target.value);
    });

    // Apply preconfiguration
    // document.getElementById("applyPreconfig").addEventListener("click", () => {
    //   this.applyPreconfiguration();
    // });

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
      });

    // Quick charging power selection
    document
      .getElementById("quickChargingPowerSelect")
      .addEventListener("change", (e) => {
        document.getElementById("chargingPowerSelect").value = e.target.value;
        this.updateCalculations();
      });

    // Quick tariff selection
    document
      .getElementById("quickTariffSelect")
      .addEventListener("change", (e) => {
        this.applyTariffFilter(e.target.value);
        this.updateCalculations();
      });
  }

  handlePresetSelection(presetId) {
    if (!presetId) {
      return;
    }

    const preset = this.presets[presetId];
    if (!preset) {
      return;
    }

    // Update dual slider with preset values
    if (this.dualSlider) {
      this.dualSlider.setValues(preset.currentCharge, preset.targetCharge);
    }

    document.getElementById("chargingPowerSelect").value = preset.chargingPower;
    document.getElementById("quickChargingPowerSelect").value =
      preset.chargingPower;
    document.getElementById("chargingPowerSelect").value = preset.chargingPower;
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
      ...this.fetchFormValuesFromDOM(),
      selectedVehicle: this.selectedVehicle,
    });

    // Show success message
    this.showPreconfigMessage("Konfiguration angewendet!", "success");
  }

  // applyPreconfiguration() {
  //   const vehicle = document.getElementById("quickVehicleSelect").value;
  //   this.selectedVehicle = vehicle;

  //   const chargingPower = document.getElementById(
  //     "quickChargingPowerSelect"
  //   ).value;
  //   const tariffFilter = document.getElementById("quickTariffSelect").value;

  //   this.presets["custom"] = {
  //     vehicle: vehicle,
  //     chargingPower: chargingPower,
  //     tariffFilter: tariffFilter,
  //   };

  //   // Apply to main form
  //   // document.getElementById("vehicleSelect").value = vehicle;
  //   // document.getElementById("chargingPowerSelect").value = chargingPower;

  //   // Update selected vehicle

  //   // Apply tariff filter
  //   this.applyTariffFilter(tariffFilter);

  //   // Update calculations
  //   this.updateCalculations();
  //   this.chartManager.updateChargingChart({
  //     ...this.fetchFormValuesFromDOM(),
  //     selectedVehicle: this.selectedVehicle,
  //   });

  //   this.showPreconfigMessage("Konfiguration angewendet!", "success");
  // }

  savePreconfiguration() {
    const formValues = this.fetchFormValuesFromDOM();
    const config = {
      vehicle: document.getElementById("quickVehicleSelect").value,
      chargingPower: document.getElementById("quickChargingPowerSelect").value,
      tariffFilter: document.getElementById("quickTariffSelect").value,
      batteryCapacity: formValues.batteryCapacity,
      currentCharge: formValues.currentCharge,
      targetCharge: formValues.targetCharge,
      selectedProviders: Array.from(this.selectedProviders),
    };

    // Save to localStorage
    localStorage.setItem(
      "charging-calculator-preconfig",
      JSON.stringify(config)
    );
    this.showPreconfigMessage("Konfiguration gespeichert!", "success");
  }

  resetPreconfiguration() {
    // Reset all preconfiguration fields
    // document.getElementById("presetSelect").value = "";
    // document.getElementById("quickVehicleSelect").value =
    //   "renault-5-e-tech-52kwh";
    // document.getElementById("quickChargingPowerSelect").value = "22";
    // document.getElementById("quickTariffSelect").value = "all";

    // Clear saved configuration
    localStorage.removeItem("charging-calculator-preconfig");

    this.showPreconfigMessage("Konfiguration gelöscht!", "info");
  }

  applyTariffFilter(filterType) {
    this.selectProvidersByCategory(filterType);
    // this.populateTariffTable();
  }

  selectProvidersByCategory(category) {
    if (category === "custom") {
      return;
    }

    let newSelectedProviders = [];
    if (category === "cheapest") {
      newSelectedProviders = this.tariffManager.getCheapestProviderIds();
    } else if (category === "all") {
      newSelectedProviders = this.tariffManager.providers.map((p) => p.id);
    } else {
      newSelectedProviders = this.tariffManager
        .getProvidersByCategory(category)
        .map((p) => p.id);
    }

    this.selectedProviders = new Set(newSelectedProviders);

    document
      .querySelectorAll('#providerCheckboxes input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = newSelectedProviders.includes(checkbox.value);
        if (checkbox.checked) {
          this.selectedProviders.add(checkbox.value);
        } else {
          this.selectedProviders.delete(checkbox.value);
        }
      });
  }

  showPreconfigMessage(message, type = "info") {
    ViewHelper.showMessage(message, type, "preconfigMessage");
  }

  loadSavedPreconfiguration() {
    const saved = localStorage.getItem("charging-calculator-preconfig");
    if (saved) {
      try {
        const config = JSON.parse(saved);

        document.getElementById("presetSelect").value = "custom";

        // Apply saved configuration
        document.getElementById("quickVehicleSelect").value = config.vehicle; // || "renault-5-e-tech-52kwh";
        document.getElementById("quickChargingPowerSelect").value =
          config.chargingPower; // || "22";
        document.getElementById("chargingPowerSelect").value =
          config.chargingPower;
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
        }

        // Apply the configuration
        // this.applyPreconfiguration();

        this.applyTariffFilter(config.tariffFilter);

        this.selectedProviders = new Set(config.selectedProviders);
        document
          .querySelectorAll('#providerCheckboxes input[type="checkbox"]')
          .forEach((checkbox) => {
            checkbox.checked = config.selectedProviders.includes(
              checkbox.value
            );
          });

        this.updateCalculations();
        this.showPreconfigMessage("Konfiguration geladen!", "success");
      } catch (error) {
        console.error("Error loading saved preconfiguration:", error);
      }
    }
  }

  populateProviderFilters() {
    const container = document.getElementById("providerCheckboxes");

    container.innerHTML = this.tariffManager.providers
      .map(
        (provider) => `
            <div class="checkbox-item">
                <input type="checkbox" id="provider-${provider.id}"
                       value="${provider.id}" checked>
                <label for="provider-${provider.id}">${provider.name}</label>
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

    if (this.selectedProviders.size === 0) {
      // Initialize selected providers
      this.selectedProviders = new Set(
        this.tariffManager.providers.map((p) => p.id)
      );
    }
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

  switchFilterTab(tabName) {
    // Update tab buttons
    document.querySelectorAll(".filter-tab").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

    // Update target of filter buttons
    document.getElementById("filter-selectAll").dataset.target = tabName;
    document.getElementById("filter-deselectAll").dataset.target = tabName;

    // Update tab content
    document.querySelectorAll(".filter-content").forEach((content) => {
      content.classList.remove("active");
    });
    document.getElementById(tabName).classList.add("active");
  }

  calculateEnergyToCharge(batteryCapacity, currentCharge, targetCharge) {
    // TODO: get formValues from DOM
    const energyToCharge =
      (batteryCapacity * (targetCharge - currentCharge)) / 100;
    this.calculatedValues.energyToCharge = energyToCharge;
    return energyToCharge;
  }

  calculateTotalEnergyCost(kwhToCharge, pricePerKwh) {
    // TODO: get formValues from DOM
    return kwhToCharge * pricePerKwh;
  }

  calculateTotalParkingTime(startTime, endTime, estimatedChargingDuration = 0) {
    // TODO: get formValues from DOM
    let totalParkingTime;
    const startTimeObject = CustomDate.parse(startTime);

    if (endTime) {
      const endTimeObject = CustomDate.parse(endTime);
      const parkingDuration = DateTimeHelper.calculateTimeDifference(
        startTimeObject,
        endTimeObject
      );
      // if estimatedChargingDuration is longer than given parkingDuration, use estimated charging duration
      // TODO: update endTime or show warning?
      totalParkingTime = Math.max(parkingDuration, estimatedChargingDuration);
    } else {
      totalParkingTime = estimatedChargingDuration;
      endTimeObject = startTimeObject.addMinutesCopy(totalParkingTime);
      const endTimeValue = endTimeObject.getDateTimePickerString();
      document.getElementById("calculator-input-endDate").value = endTimeValue;
    }

    this.calculatedValues.totalParkingTime = totalParkingTime;
  }

  updateCalculations() {
    const formValues = this.fetchFormValuesFromDOM();

    const {
      batteryCapacity,
      currentCharge,
      targetCharge,
      chargingPower,
      chargingType,
      startTime,
      endTime,
    } = formValues;

    // get selected option from chargingPower select
    const startTimeObject = CustomDate.parse(startTime);
    let endTimeObject; // = new CustomDate(endTimePickerValue);

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
        batteryCapacity,
        chargingType
      );

      this.calculatedValues.chargingResult = chargingResult;

      const energyToCharge = chargingResult.totalEnergy;
      this.calculatedValues.energyToCharge = energyToCharge;
      const estimatedTime = chargingResult.totalTime; // in minutes
      this.calculatedValues.estimatedTime = estimatedTime;

      // Calculate total parking time from start and end time
      let totalParkingTime = 0;
      if (endTime) {
        endTimeObject = CustomDate.parse(endTime);
        const currentTotalParkingTime = DateTimeHelper.calculateTimeDifference(
          startTimeObject,
          endTimeObject
        );
        totalParkingTime = Math.max(currentTotalParkingTime, estimatedTime);
      } else {
        totalParkingTime = estimatedTime;

        // FIXME: move to a better place
        endTimeObject = startTimeObject.addMinutesCopy(totalParkingTime);
        const endTimeValue = endTimeObject.getDateTimePickerString();
        document.getElementById("calculator-input-endDate").value =
          endTimeValue;
      }
      this.calculatedValues.totalParkingTime = totalParkingTime;

      const totalParkingTimeString =
        DateTimeHelper.formatDuration(totalParkingTime);

      ViewHelper.setElementText(
        "energyToCharge",
        `${energyToCharge.toFixed(1)} kWh`
      );

      const estimatedTimeString = DateTimeHelper.formatDuration(estimatedTime);
      ViewHelper.setElementText("estimatedTime", estimatedTimeString);
      ViewHelper.setElementText("totalParkingTime", totalParkingTimeString);

      // Update charging speed information
      VehicleDetails.updateChargingSpeedInfo(
        chargingResult,
        this.selectedVehicle,
        this.vehicleCurves,
        chargingType,
        "vehicle-details"
      );
    } else {
      // TODO: set in index.html?
      // Show placeholder values when inputs are empty or invalid
      // document.getElementById("calculator-input-endDate").value = "";
      ViewHelper.setElementValue("calculator-input-endDate", "");
      // document.getElementById("endTime").value =
      //   endTime || startTime + totalParkingTime;
    }

    this.populateTariffTable();
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
    } else {
      // Empty the input
      input.value = "";
    }

    // Trigger change event to update calculations
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  populateTariffTable() {
    const tbody = document.getElementById("tariffTableBody");

    const formValues = this.fetchFormValuesFromDOM();
    const {
      batteryCapacity,
      currentCharge,
      targetCharge,
      chargingPower,
      chargingType,
      startTime,
      endTime,
    } = formValues;

    const startTimeObject = CustomDate.parse(startTime);
    let endTimeObject; // = new CustomDate(endTimePickerValue);

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

    // const energyToCharge = this.calculateEnergyToCharge(
    //   batteryCapacity,
    //   currentCharge,
    //   targetCharge
    // );
    const energyToCharge = this.calculatedValues.energyToCharge;

    // Use vehicle-specific charging curves for accurate time calculation
    // const chargingResult = this.vehicleCurves.calculateChargingTime(
    //   this.selectedVehicle,
    //   currentCharge,
    //   targetCharge,
    //   chargingPower,
    //   batteryCapacity,
    //   chargingType
    // );
    // const chargingResult = this.calculatedValues.chargingResult;
    const estimatedTime = this.calculatedValues.estimatedTime; // in minutes
    // let possibleTotalParkingTime = 0;

    // if (endTime) {
    //   endTimeObject = CustomDate.parse(endTime);
    //   possibleTotalParkingTime = DateTimeHelper.calculateTimeDifference(
    //     startTimeObject,
    //     endTimeObject
    //   );
    // } else {
    //   possibleTotalParkingTime = estimatedTime;
    // }

    // let totalParkingTime = Math.max(possibleTotalParkingTime, estimatedTime);
    const totalParkingTime = this.calculatedValues.totalParkingTime;
    const blockingTime = Math.max(0, totalParkingTime);

    // Update header with actual energy amount
    this.updateTariffTableHeaderPricePerSelectedKwh(energyToCharge);

    // Update header with actual blocking time
    this.updateTariffTableHeaderTotalBlockingFeeMinutes(blockingTime);

    // Filter tariffs based on selected providers and connectors
    const filteredTariffs = this.tariffManager.getFilteredTariffs({
      providers: Array.from(this.selectedProviders),
      connectors: Array.from(this.selectedConnectors),
    });

    this.fetchFormValuesFromDOM();
    endTimeObject = new CustomDate(this.formValues.endTime);
    // const endTimeValue = endTimeObject.getDateTimePickerString();

    // // FIXME: move to a better place
    // document.getElementById("calculator-input-endDate").value = endTimeValue;

    // Sort provider tariffs by total cost using the new class methods
    const sortedProviderTariffs = this.tariffManager.sortByCost(
      filteredTariffs,
      energyToCharge,
      estimatedTime,
      blockingTime,
      startTimeObject,
      endTimeObject
    );

    // Sort provider tariffs only (custom tariff has its own input row)
    const sortedTariffs = sortedProviderTariffs.sort(
      (a, b) => a.totalCost - b.totalCost
    );
    // Create custom tariff row
    const customTariffRow = this.createCustomTariffRow(energyToCharge);

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
                  <span>
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
                          "<span class='price-unit'>€</span>"
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
    // this.updateCustomTariffDisplay(energyToCharge);

    // REVIEW: are these connected in ANY way???
    // Update charging chart
    this.chartManager?.updateChargingChart({
      batteryCapacity,
      currentCharge,
      targetCharge,
      chargingPower,
      chargingType: chargingType,
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
    const formValues = this.fetchFormValuesFromDOM();
    const { batteryCapacity, currentCharge, targetCharge } = formValues;

    if (batteryCapacity > 0 && targetCharge > currentCharge) {
      const energyToCharge = this.calculateEnergyToCharge(
        batteryCapacity,
        currentCharge,
        targetCharge
      );
      this.updateCustomTariffDisplay(energyToCharge);
    }
  }

  updateCustomTariffDisplay(energyToCharge) {
    const customPricePerKwh =
      parseFloat(document.getElementById("custom-price-per-kwh")?.value) || 0.5;
    // const customBaseFee =
    //   parseFloat(document.getElementById("custom-base-fee")?.value) || 0.0;
    const customBlockingFee = parseFloat(
      document.getElementById("custom-blocking-fee")?.value
    );
    const pricePerSelectedKwh = this.calculateTotalEnergyCost(
      energyToCharge,
      customPricePerKwh
    );

    // Calculate estimated time and blocking time
    const formValues = this.fetchFormValuesFromDOM();
    const {
      batteryCapacity,
      currentCharge,
      targetCharge,
      chargingPower,
      chargingType,
      startTime,
      endTime,
    } = formValues;

    const startTimeObject = CustomDate.parse(startTime);
    const endTimeObject = CustomDate.parse(endTime);

    let totalCost = 0;
    let effectivePricePerKwh = 0;
    let blockingFeeCost = 0;
    let totalParkingTime = 0;

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
        batteryCapacity,
        chargingType
      );
      // REVIEW: unused
      const estimatedTime = chargingResult.totalTime; // in minutes
      totalParkingTime = DateTimeHelper.calculateTimeDifference(
        startTimeObject,
        endTimeObject
      );
      const blockingTime = Math.max(0, totalParkingTime, estimatedTime);

      // Calculate total cost (matching calculateCustomTariff logic)
      const energyCost = this.calculateTotalEnergyCost(
        energyToCharge,
        customPricePerKwh
      );
      const timeCost = 0; // Custom tariff doesn't have pricePerMin, so timeCost is always 0

      blockingFeeCost = blockingTime * customBlockingFee;
      totalCost = energyCost + timeCost + blockingFeeCost; // + customBaseFee
      effectivePricePerKwh =
        energyToCharge > 0 ? totalCost / energyToCharge : 0;
    }

    // // Update price per selected kWh
    // this.updatePricePerSelectedKwhHeader(energyToCharge);

    // // Update total blocking fee minutes
    // this.updateTotalBlockingFeeMinutesHeader(totalParkingTime);

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

    // Update price per selected kWh
    const pricePerSelectedKwhElement = document.getElementById(
      "custom-price-per-selected-kwh-value"
    );
    if (pricePerSelectedKwhElement) {
      pricePerSelectedKwhElement.textContent = `${pricePerSelectedKwh.toFixed(
        2
      )}`;
    }
  }

  updateTariffTableHeaderPricePerSelectedKwh(energyToCharge) {
    ViewHelper.setElementText(
      "tariff-table-header-price-per-selected-kwh-value",
      energyToCharge.toFixed(1)
    );

    // // const pricePerSelectedKwhUnit = document.getElementById(
    // //   "pricePerSelectedKwhUnit"
    // // );
    // // if (pricePerSelectedKwhUnit) {
    // //   pricePerSelectedKwhUnit.textContent = "kWh";
    // // }
  }

  updateTariffTableHeaderTotalBlockingFeeMinutes(blockingTime) {
    const durationObject = DateTimeHelper.formatDurationAsObject(blockingTime);

    ViewHelper.setElementText(
      "tariff-table-header-total-blocking-fee-minutes-value",
      durationObject.value
    );
    ViewHelper.setElementText(
      "tariff-table-header-total-blocking-fee-minutes-unit",
      durationObject.unit
    );
  }

  createCustomTariffRow(energyToCharge) {
    // Calculate initial energy cost dynamically
    // const batteryCapacity =
    //   parseFloat(document.getElementById("batteryCapacity")?.value) || 0;
    // const currentCharge =
    //   parseFloat(
    //     document.getElementById("chargeLevelSlider-value-start").value
    //   ) || 0;
    // const targetCharge =
    //   parseFloat(
    //     document.getElementById("chargeLevelSlider-value-end").value
    //   ) || 0;

    // const formValues = this.fetchFormValuesFromDOM();
    // const { batteryCapacity, currentCharge, targetCharge } = formValues;

    // const energyToCharge =
    //   batteryCapacity > 0 && targetCharge > currentCharge
    //     ? this.calculateEnergyToCharge(
    //         batteryCapacity,
    //         currentCharge,
    //         targetCharge
    //       )
    //     : 0;

    const customPricePerKwh = 0.5; // Default value
    const initialEnergyCost = this.calculateTotalEnergyCost(
      energyToCharge,
      customPricePerKwh
    );

    const customBlockingFee = 0.02;
    const initialBlockingFee = this.calculateTotalEnergyCost(
      energyToCharge,
      customBlockingFee
    );

    const customTotalCost = initialEnergyCost + initialBlockingFee;
    const customEffectivePricePerKwh =
      energyToCharge > 0 ? customTotalCost / energyToCharge : 0;

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
              ${customTotalCost.toFixed(2)}
            </span>
            <span class="price-unit">€</span>
          </span>
          <br/>
          <small class="effective-price" id="custom-effective-price">
            <span class="price-value" id="custom-effective-price-value">
              ${customEffectivePricePerKwh.toFixed(2)}
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
