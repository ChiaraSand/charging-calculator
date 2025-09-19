/**
 * DualSlider Component
 * A modular, lightweight dual slider for range selection (e.g., current and target charge)
 */
class DualSlider {
  constructor(options = {}) {
    this.options = {
      min: 0,
      max: 100,
      step: 1,
      currentValue: 20,
      targetValue: 80,
      unit: "%",
      label: "Charge Level",
      currentLabel: "Current",
      targetLabel: "Target",
      onChange: null,
      container: null,
      ...options,
    };

    this.currentValue = this.options.currentValue;
    this.targetValue = this.options.targetValue;
    this.isDragging = false;
    this.dragType = null; // 'current' or 'target'
    this.touchStartX = 0;

    this.init();
  }

  init() {
    this.createHTML();
    this.bindEvents();
    this.updateDisplay();
  }

  createHTML() {
    const container = this.options.container || document.body;

    this.element = document.createElement("div");
    this.element.className = "dual-slider";
    this.element.innerHTML = `
      <div class="dual-slider-header">
        <label for="chargeLevelSlider" class="dual-slider-label">${
          this.options.label
        }</label>
      </div>
      <div class="dual-slider-container">
        <div class="dual-slider-values">
          <div>
            <input
              type="number"
              class="dual-slider-current-value"
              value="${this.currentValue}"
              min="${this.options.min}"
              max="${this.options.max}"
              step="${this.options.step}"
              aria-label="${this.options.currentLabel} charge level"
            />
            <span class="dual-slider-unit">${this.options.unit}</span>
          </div>
          <span class="dual-slider-separator">→</span>
          <div>
          <input
            type="number"
            class="dual-slider-target-value"
            value="${this.targetValue}"
            min="${this.options.min}"
            max="${this.options.max}"
            step="${this.options.step}"
            aria-label="${this.options.targetLabel} charge level"
            />
            <span class="dual-slider-unit">${this.options.unit}</span>
          </div>
        </div>
        <div class="dual-slider-track">
          <div class="dual-slider-progress" style="left: ${this.getPercentage(
            this.currentValue
          )}%; width: ${this.getPercentage(
      this.targetValue - this.currentValue
    )}%"></div>
          <div class="dual-slider-handle dual-slider-handle-current" style="left: ${this.getPercentage(
            this.currentValue
          )}%"></div>
          <div class="dual-slider-handle dual-slider-handle-target" style="left: ${this.getPercentage(
            this.targetValue
          )}%"></div>
        </div>
        <div class="dual-slider-labels">
          <span class="dual-slider-label-current">${
            this.options.currentLabel
          }</span>
          <span class="dual-slider-label-target">${
            this.options.targetLabel
          }</span>
        </div>
      </div>
    `;

    container.appendChild(this.element);
  }

  bindEvents() {
    const track = this.element.querySelector(".dual-slider-track");
    const currentHandle = this.element.querySelector(
      ".dual-slider-handle-current"
    );
    const targetHandle = this.element.querySelector(
      ".dual-slider-handle-target"
    );

    // Mouse events
    currentHandle.addEventListener("mousedown", (e) =>
      this.startDrag(e, "current")
    );
    targetHandle.addEventListener("mousedown", (e) =>
      this.startDrag(e, "target")
    );
    track.addEventListener("mousedown", (e) => this.handleTrackClick(e));

    // Touch events
    currentHandle.addEventListener(
      "touchstart",
      (e) => this.startDrag(e, "current"),
      { passive: false }
    );
    targetHandle.addEventListener(
      "touchstart",
      (e) => this.startDrag(e, "target"),
      { passive: false }
    );
    track.addEventListener("touchstart", (e) => this.handleTrackClick(e), {
      passive: false,
    });

    // Global events
    document.addEventListener("mousemove", (e) => this.handleDrag(e));
    document.addEventListener("mouseup", () => this.endDrag());
    document.addEventListener("touchmove", (e) => this.handleDrag(e), {
      passive: false,
    });
    document.addEventListener("touchend", () => this.endDrag());

    // Keyboard events
    currentHandle.addEventListener("keydown", (e) =>
      this.handleKeydown(e, "current")
    );
    targetHandle.addEventListener("keydown", (e) =>
      this.handleKeydown(e, "target")
    );

    // Input field events
    const currentInput = this.element.querySelector(
      ".dual-slider-current-value"
    );
    const targetInput = this.element.querySelector(".dual-slider-target-value");

    currentInput.addEventListener("input", (e) => {
      this.handleInputChange(e, "current");
    });
    currentInput.addEventListener("blur", (e) => {
      this.handleInputBlur(e, "current");
    });

    targetInput.addEventListener("input", (e) => {
      this.handleInputChange(e, "target");
    });
    targetInput.addEventListener("blur", (e) => {
      this.handleInputBlur(e, "target");
    });
  }

  startDrag(e, type) {
    e.preventDefault();
    this.isDragging = true;
    this.dragType = type;
    this.touchStartX =
      e.type === "touchstart" ? e.touches[0].clientX : e.clientX;

    // Add visual feedback
    document.body.classList.add("dual-slider-dragging");
    this.element.classList.add("dual-slider-active");
  }

  handleDrag(e) {
    if (!this.isDragging) return;

    e.preventDefault();
    const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
    const track = this.element.querySelector(".dual-slider-track");
    const rect = track.getBoundingClientRect();
    const percentage = Math.max(
      0,
      Math.min(100, ((clientX - rect.left) / rect.width) * 100)
    );
    const value = this.percentageToValue(percentage);

    this.updateValue(this.dragType, value);
  }

  handleTrackClick(e) {
    if (this.isDragging) return;

    const track = this.element.querySelector(".dual-slider-track");
    const rect = track.getBoundingClientRect();
    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
    const value = this.percentageToValue(percentage);

    // Determine which handle to move based on which is closer
    const currentDistance = Math.abs(value - this.currentValue);
    const targetDistance = Math.abs(value - this.targetValue);

    if (currentDistance < targetDistance) {
      this.updateValue("current", value);
    } else {
      this.updateValue("target", value);
    }
  }

  handleKeydown(e, type) {
    const step = this.options.step;
    let newValue = type === "current" ? this.currentValue : this.targetValue;

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        newValue = Math.max(this.options.min, newValue - step);
        break;
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        newValue = Math.min(this.options.max, newValue + step);
        break;
      case "Home":
        e.preventDefault();
        newValue = this.options.min;
        break;
      case "End":
        e.preventDefault();
        newValue = this.options.max;
        break;
      default:
        return;
    }

    this.updateValue(type, newValue);
  }

  endDrag() {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.dragType = null;
    document.body.classList.remove("dual-slider-dragging");
    this.element.classList.remove("dual-slider-active");
  }

  handleInputChange(e, type) {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      this.updateValue(type, value);
    }
  }

  handleInputBlur(e, type) {
    const value = parseFloat(e.target.value);
    if (isNaN(value) || value < this.options.min || value > this.options.max) {
      // Reset to current value if invalid
      e.target.value =
        type === "current" ? this.currentValue : this.targetValue;
    }
  }

  updateValue(type, value) {
    // Ensure value is within bounds and respects step
    value = Math.max(this.options.min, Math.min(this.options.max, value));
    value = Math.round(value / this.options.step) * this.options.step;

    // Ensure current <= target
    if (type === "current" && value > this.targetValue) {
      value = this.targetValue;
    } else if (type === "target" && value < this.currentValue) {
      value = this.currentValue;
    }

    if (type === "current") {
      this.currentValue = value;
    } else {
      this.targetValue = value;
    }

    this.updateDisplay();
    this.triggerChange();
  }

  updateDisplay() {
    const currentHandle = this.element.querySelector(
      ".dual-slider-handle-current"
    );
    const targetHandle = this.element.querySelector(
      ".dual-slider-handle-target"
    );
    const progress = this.element.querySelector(".dual-slider-progress");
    const currentValueInput = this.element.querySelector(
      ".dual-slider-current-value"
    );
    const targetValueInput = this.element.querySelector(
      ".dual-slider-target-value"
    );

    const currentPercentage = this.getPercentage(this.currentValue);
    const targetPercentage = this.getPercentage(this.targetValue);

    currentHandle.style.left = `${currentPercentage}%`;
    targetHandle.style.left = `${targetPercentage}%`;
    progress.style.left = `${currentPercentage}%`;
    progress.style.width = `${targetPercentage - currentPercentage}%`;

    // Update input values only if they don't have focus (to avoid interrupting user typing)
    if (currentValueInput && document.activeElement !== currentValueInput) {
      currentValueInput.value = this.currentValue;
    }
    if (targetValueInput && document.activeElement !== targetValueInput) {
      targetValueInput.value = this.targetValue;
    }
  }

  getPercentage(value) {
    return (
      ((value - this.options.min) / (this.options.max - this.options.min)) * 100
    );
  }

  percentageToValue(percentage) {
    return (
      this.options.min +
      (percentage / 100) * (this.options.max - this.options.min)
    );
  }

  triggerChange() {
    if (this.options.onChange) {
      this.options.onChange({
        current: this.currentValue,
        target: this.targetValue,
        range: this.targetValue - this.currentValue,
      });
    }
  }

  // Public API methods
  setValues(current, target) {
    this.currentValue = Math.max(
      this.options.min,
      Math.min(this.options.max, current)
    );
    this.targetValue = Math.max(
      this.options.min,
      Math.min(this.options.max, target)
    );

    // Ensure current <= target
    if (this.currentValue > this.targetValue) {
      this.currentValue = this.targetValue;
    }

    this.updateDisplay();
  }

  getValues() {
    return {
      current: this.currentValue,
      target: this.targetValue,
      range: this.targetValue - this.currentValue,
    };
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

export default DualSlider;
