/**
 * ChartManager class for handling charging chart functionality
 */
class ChartManager {
  constructor(vehicleCurves, chargingPowers = []) {
    this.chargingChart = null;
    this.vehicleCurves = vehicleCurves;
    this.chargingPowers =
      chargingPowers.length > 0 ? chargingPowers : [400, 300, 150, 50, 22, 11];
  }

  /**
   * Initialize the charging chart
   * @param {string} canvasId - ID of the canvas element
   */
  initializeChargingChart(canvasId = "chargingLevelChart") {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    this.chargingChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            id: "charging-realistic",
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
            id: "charging-linear",
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
            id: "charging-400",
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
            id: "charging-300",
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
            id: "charging-150",
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
            id: "charging-50",
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
            id: "charging-22",
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
            id: "charging-11",
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
          {
            id: "charging-current",
            label: "Aktueller Ladezustand",
            data: [],
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            borderWidth: 2,
          },
          {
            id: "charging-target",
            label: "Ziel Ladezustand",
            data: [],
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderWidth: 2,
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

    this.hideAllDatasets();
  }

  /**
   * Update the charging chart with new data
   * @param {Object} params - Chart update parameters
   * @param {number} params.batteryCapacity - Battery capacity in kWh
   * @param {number} params.currentCharge - Current charge percentage
   * @param {number} params.targetCharge - Target charge percentage
   * @param {number} params.chargingPower - Charging power in kW
   * @param {string} params.selectedVehicle - Selected vehicle ID
   */
  updateChargingChart(params = {}) {
    if (!this.chargingChart) return;

    const {
      batteryCapacity = 0,
      currentCharge = 0,
      targetCharge = 0,
      chargingPower = 0,
      selectedVehicle = "renault-5-e-tech-52kwh",
      chargingType = "DC",
    } = params;

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
      selectedVehicle,
      currentCharge,
      targetCharge,
      chargingPower,
      batteryCapacity,
      chargingType
    );

    const estimatedTime = chargingResult.totalTime; // in minutes

    // Generate data points for the chart
    const timePoints = [];
    const realisticChargingLevels = [];
    const linearChargingLevels = [];

    // Additional charging power curves
    const chargingPowers =
      this.chargingPowers.length > 0
        ? this.chargingPowers
        : [400, 300, 150, 50, 22, 11];
    const additionalCurves = chargingPowers.map(() => []);

    // Create time points every 5 minutes or every minute for shorter sessions
    const interval = estimatedTime <= 30 ? 1 : 5;
    const maxTime = Math.ceil(estimatedTime * 1.1); // Show 10% more than estimated

    for (let time = 0; time <= maxTime; time += interval) {
      timePoints.push(time);

      // Linear charging (simple calculation)
      const linearLevel = Math.min(
        currentCharge + (time / estimatedTime) * (targetCharge - currentCharge),
        targetCharge
      );
      linearChargingLevels.push(linearLevel);

      // Vehicle-specific realistic charging curve using chargingResult data
      let batteryLevel = currentCharge;
      if (chargingResult.timeSteps && chargingResult.timeSteps.length > 0) {
        // Find the appropriate battery level based on time using the charging curve data
        if (
          time >= chargingResult.timeSteps[chargingResult.timeSteps.length - 1]
        ) {
          // If time exceeds the charging curve, use the final level
          batteryLevel = chargingResult.finalBatteryLevel;
        } else {
          // Interpolate between time steps to find the current battery level
          for (let i = 0; i < chargingResult.timeSteps.length - 1; i++) {
            const currentTime = chargingResult.timeSteps[i];
            const nextTime = chargingResult.timeSteps[i + 1];

            if (time >= currentTime && time <= nextTime) {
              // Calculate the battery level based on the step index
              // Each step represents 1% of battery capacity
              const stepProgress =
                (time - currentTime) / (nextTime - currentTime);
              const currentStepLevel = currentCharge + i;
              const nextStepLevel = currentCharge + (i + 1);
              batteryLevel =
                currentStepLevel +
                (nextStepLevel - currentStepLevel) * stepProgress;
              break;
            }
          }
        }
      } else {
        // Fallback to linear if no curve data available
        const progress = Math.min(time / estimatedTime, 1);
        batteryLevel =
          currentCharge + (targetCharge - currentCharge) * progress;
      }
      realisticChargingLevels.push(batteryLevel);

      // Calculate additional charging power curves
      this.chargingPowers.forEach((power, index) => {
        const additionalResult = this.vehicleCurves.calculateChargingTime(
          selectedVehicle,
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

    // TODO: add horizontal lines for current and target charge
    // this.chargingChart.data.datasets[0].data = currentCharge;
    // this.chargingChart.data.datasets[1].data = targetCharge;
    this.chargingChart.data.datasets[0].data = realisticChargingLevels;
    this.chargingChart.data.datasets[1].data = linearChargingLevels;

    additionalCurves.forEach((curve, index) => {
      this.chargingChart.data.datasets[index + 2].data = curve;
    });

    // this.chargingChart.data.datasets[8].data = currentCharge;
    // this.chargingChart.data.datasets[9].data = targetCharge;
    // console.log(this.chargingChart.data.datasets);

    this.chargingChart.update();
  }

  // REVIEW: unused???
  /**
   * Calculate realistic charging level for a given time
   * @param {number} currentCharge - Current charge percentage
   * @param {number} targetCharge - Target charge percentage
   * @param {number} time - Time in minutes
   * @param {number} estimatedTime - Total estimated charging time
   * @param {number} chargingPower - Charging power in kW
   * @returns {number} Realistic battery level percentage
   */
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
        legendItem.querySelector("i.fas.fa-eye-slash").style.display = "block";
        legendItem.querySelector("i.fas.fa-eye").style.display = "none";
        legendItem.classList.add("legend-item-hidden");
      } else {
        legendItem.querySelector("i.fas.fa-eye-slash").style.display = "none";
        legendItem.querySelector("i.fas.fa-eye").style.display = "block";
        legendItem.classList.remove("legend-item-hidden");
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
        legendItem.querySelector("i.fas.fa-eye-slash").style.display = "none";
        legendItem.querySelector("i.fas.fa-eye").style.display = "block";
        legendItem.classList.remove("legend-item-hidden");
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
      if (
        dataset.label === "Ladeverlauf (realistisch)" ||
        dataset.label === "Lineare Schätzung"
      ) {
        dataset.hidden = false;
        const legendItem = document.querySelector(`[data-dataset="${index}"]`);
        if (legendItem) {
          legendItem.querySelector("i.fas.fa-eye-slash").style.display = "none";
          legendItem.querySelector("i.fas.fa-eye").style.display = "block";
          legendItem.classList.remove("legend-item-hidden");
        }
      } else {
        dataset.hidden = true;
        const legendItem = document.querySelector(`[data-dataset="${index}"]`);
        if (legendItem) {
          legendItem.querySelector("i.fas.fa-eye-slash").style.display =
            "block";
          legendItem.querySelector("i.fas.fa-eye").style.display = "none";
          legendItem.classList.add("legend-item-hidden");
        }
      }
    });

    this.chargingChart.update();
  }
}

export default ChartManager;
