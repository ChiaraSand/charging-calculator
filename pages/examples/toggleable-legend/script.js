function toggleItem(index) {
  const item = document.querySelector(`[data-dataset="${index}"]`);
  const button = item.querySelector(".legend-toggle");
  const icon = button.querySelector("i");

  if (item.classList.contains("hidden")) {
    item.classList.remove("hidden");
    icon.className = "fas fa-eye";
  } else {
    item.classList.add("hidden");
    icon.className = "fas fa-eye-slash";
  }
}

function showAll() {
  document.querySelectorAll(".legend-item").forEach((item) => {
    item.classList.remove("hidden");
    const button = item.querySelector(".legend-toggle");
    const icon = button.querySelector("i");
    icon.className = "fas fa-eye";
  });
}

function hideAll() {
  // Keep first two items (realistic and linear) visible
  document.querySelectorAll(".legend-item").forEach((item, index) => {
    if (index < 2) {
      item.classList.remove("hidden");
      const button = item.querySelector(".legend-toggle");
      const icon = button.querySelector("i");
      icon.className = "fas fa-eye";
    } else {
      item.classList.add("hidden");
      const button = item.querySelector(".legend-toggle");
      const icon = button.querySelector("i");
      icon.className = "fas fa-eye-slash";
    }
  });
}

// Add click handlers for legend items
document.querySelectorAll(".legend-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    if (!e.target.closest(".legend-toggle")) {
      const datasetIndex = parseInt(item.dataset.dataset);
      toggleItem(datasetIndex);
    }
  });
});
