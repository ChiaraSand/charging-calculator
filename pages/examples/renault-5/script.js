// Renault 5 E-Tech charging curve data (400kW charger)
const renault5ChargingData = {
  14: 100.39,
  15: 100.56,
  16: 100.96,
  17: 100.93,
  18: 100.93,
  19: 100.96,
  20: 100.89,
  21: 100.89,
  22: 100.95,
  23: 100.88,
  24: 100.95,
  25: 100.95,
  26: 100.59,
  27: 99.68,
  28: 98.28,
  29: 97.45,
  30: 96.05,
  31: 95.35,
  32: 94.56,
  33: 93.61,
  34: 93.16,
  35: 92.5,
  36: 91.76,
  37: 91.46,
  38: 91.14,
  39: 90.57,
  40: 88.88,
  41: 87.86,
  42: 86.94,
  43: 84.93,
  44: 83.89,
  45: 82.51,
  46: 81.66,
  47: 80.24,
  48: 78.74,
  49: 76.19,
  50: 75.86,
  51: 76.19,
  52: 76.2,
  53: 75.43,
  54: 73.26,
  55: 71.48,
  56: 70.56,
  57: 69.34,
  58: 67.97,
  59: 66.54,
  60: 65.65,
  61: 65.5,
  62: 65.75,
  63: 64.07,
  64: 61.15,
  65: 60.56,
  66: 60.44,
  67: 60.58,
  68: 60.87,
  69: 60.83,
  70: 59.69,
  71: 58.76,
  72: 57.37,
  73: 56.39,
  74: 55.78,
  75: 55.05,
  76: 54.17,
  77: 53.02,
  78: 52.14,
  79: 51.1,
  80: 41.85,
  81: 39.94,
  82: 37.66,
  83: 36.2,
  84: 33.76,
  85: 33.43,
  86: 33.64,
  87: 34.13,
  88: 33.25,
  89: 32.7,
  90: 32.03,
  91: 31.95,
  92: 31.98,
  93: 28.39,
  94: 22.62,
  95: 18.64,
  96: 18.39,
  97: 14.62,
};

// Calculate charging curves for different power levels
function calculateChargingCurve(chargerPower, batteryCapacity = 52) {
  const curve = [];
  const timePoints = [];
  let totalTime = 0;

  // Calculate charging from 14% to 97% (available data range)
  for (let soc = 14; soc <= 97; soc += 1) {
    // Get actual charging power at this SOC
    let actualPower = renault5ChargingData[soc] || 0;

    // Limit by charger power
    actualPower = Math.min(actualPower, chargerPower);

    // Calculate time for 1% charge
    const energyFor1Percent = (batteryCapacity * 1) / 100; // kWh
    const timeFor1Percent = (energyFor1Percent / actualPower) * 60; // minutes

    totalTime += timeFor1Percent;
    timePoints.push(totalTime);
    curve.push(soc);
  }

  return { curve, timePoints };
}

// Generate chart data
const chargingPowers = [400, 300, 150, 100, 50, 22, 11];
const datasets = chargingPowers.map((power, index) => {
  const { curve, timePoints } = calculateChargingCurve(power);

  return {
    label: `${power} kW ${power >= 50 ? "DC" : "AC"} ${
      power >= 150 ? "Schnelllader" : power >= 50 ? "Lader" : "Wallbox"
    }`,
    data: curve,
    borderColor: [
      "#2563eb", // 400kW - blue
      "#dc2626", // 300kW - red
      "#f59e0b", // 150kW - orange
      "#8b5cf6", // 100kW - purple
      "#06b6d4", // 50kW - cyan
      "#84cc16", // 22kW - green
      "#f97316", // 11kW - orange
    ][index],
    backgroundColor: [
      "rgba(37, 99, 235, 0.1)",
      "rgba(220, 38, 38, 0.1)",
      "rgba(245, 158, 11, 0.1)",
      "rgba(139, 92, 246, 0.1)",
      "rgba(6, 182, 212, 0.1)",
      "rgba(132, 204, 22, 0.1)",
      "rgba(249, 115, 22, 0.1)",
    ][index],
    borderWidth: power === 400 ? 3 : 2,
    fill: power === 400,
    tension: 0.4,
    pointRadius: power === 400 ? 4 : 2,
    pointHoverRadius: power === 400 ? 6 : 4,
    pointBackgroundColor: [
      "#2563eb",
      "#dc2626",
      "#f59e0b",
      "#8b5cf6",
      "#06b6d4",
      "#84cc16",
      "#f97316",
    ][index],
    pointBorderColor: "#ffffff",
    pointBorderWidth: 2,
    hidden: false,
  };
});

// Create chart
const ctx = document.getElementById("chargingChart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: Array.from({ length: 84 }, (_, i) => `${i + 14}%`),
    datasets: datasets,
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: "Renault 5 E-Tech - Ladegeschwindigkeit vs. Batterieladestand",
        font: {
          size: 16,
          weight: "bold",
        },
        color: "#1e293b",
      },
      legend: {
        display: false, // We use custom legend
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          title: function (context) {
            return `Batterieladestand: ${context[0].label}`;
          },
          label: function (context) {
            const soc = parseInt(context.label);
            const power = renault5ChargingData[soc] || 0;
            const actualPower = Math.min(
              power,
              chargingPowers[context.datasetIndex]
            );
            return `${context.dataset.label}: ${actualPower.toFixed(1)} kW`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Batterieladestand (SoC)",
          font: {
            size: 14,
            weight: "bold",
          },
          color: "#64748b",
        },
        grid: {
          color: "#e2e8f0",
        },
        ticks: {
          color: "#64748b",
          maxTicksLimit: 10,
        },
      },
      y: {
        title: {
          display: true,
          text: "Ladeleistung (kW)",
          font: {
            size: 14,
            weight: "bold",
          },
          color: "#64748b",
        },
        grid: {
          color: "#e2e8f0",
        },
        ticks: {
          color: "#64748b",
        },
        beginAtZero: true,
      },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false,
    },
  },
});

// Legend toggle functionality
function setupLegendToggles() {
  // Individual legend item toggles
  document.querySelectorAll(".legend-toggle").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const datasetIndex = parseInt(button.dataset.dataset);
      toggleDataset(datasetIndex);
    });
  });

  // Legend item clicks
  document.querySelectorAll(".legend-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (!e.target.closest(".legend-toggle")) {
        const datasetIndex = parseInt(item.dataset.dataset);
        toggleDataset(datasetIndex);
      }
    });
  });

  // Show all curves button
  document.getElementById("showAllCurves").addEventListener("click", () => {
    showAllDatasets();
  });

  // Hide all curves button
  document.getElementById("hideAllCurves").addEventListener("click", () => {
    hideAllDatasets();
  });
}

function toggleDataset(datasetIndex) {
  const dataset = chart.data.datasets[datasetIndex];
  const legendItem = document.querySelector(`[data-dataset="${datasetIndex}"]`);

  if (dataset && legendItem) {
    dataset.hidden = !dataset.hidden;

    if (dataset.hidden) {
      legendItem.classList.add("hidden");
    } else {
      legendItem.classList.remove("hidden");
    }

    chart.update();
  }
}

function showAllDatasets() {
  chart.data.datasets.forEach((dataset, index) => {
    dataset.hidden = false;
    const legendItem = document.querySelector(`[data-dataset="${index}"]`);
    if (legendItem) {
      legendItem.classList.remove("hidden");
    }
  });
  chart.update();
}

function hideAllDatasets() {
  chart.data.datasets.forEach((dataset, index) => {
    if (index === 0) {
      // Keep 400kW visible
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
  chart.update();
}

// Initialize legend toggles
setupLegendToggles();
