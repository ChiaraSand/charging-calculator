class ViewHelper {
  static populateSelect(selectId, options) {
    console.log("populateSelect", selectId, options);
    const select = document.getElementById(selectId);
    select.innerHTML = options
      .map(([value, name]) => `<option value="${value}">${name}</option>`)
      .join("");
  }

  static showSection(sectionId) {
    const content = document.getElementById(sectionId + "-content");
    const button = document.getElementById(sectionId + "-toggle");

    content.classList.remove("toggle-hide");
    button.classList.remove("expanded");
    button.innerHTML = '<i class="fas fa-chevron-up"></i>';
  }

  static hideSection(sectionId) {
    const content = document.getElementById(sectionId + "-content");
    const button = document.getElementById(sectionId + "-toggle");

    content.classList.add("toggle-hide");
    button.classList.add("expanded");
    // NOTE: chevron is rotated 180deg by .expanded class -> equals chevron down
    button.innerHTML = '<i class="fas fa-chevron-up"></i>';
  }

  static toggleSection(sectionId) {
    const content = document.getElementById(sectionId + "-content");
    // const button = document.getElementById(sectionId + "-toggle");

    const currentOptions = JSON.parse(
      localStorage.getItem("charging-calculator-view-options") || "{}"
    );

    if (content.classList.contains("toggle-hide")) {
      this.showSection(sectionId);
      localStorage.setItem(
        "charging-calculator-view-options",
        JSON.stringify({
          ...currentOptions,
          [sectionId]: true,
        })
      );
    } else {
      this.hideSection(sectionId);
      localStorage.setItem(
        "charging-calculator-view-options",
        JSON.stringify({
          ...currentOptions,
          [sectionId]: false,
        })
      );
    }
  }

  static showMessage(message, type, elementId) {
    // Create or update message element
    let messageElement = document.getElementById(elementId);
    if (!messageElement) {
      messageElement = document.createElement("div");
      messageElement.id = elementId;
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

  static selectAllCheckboxes(checkboxContainerId) {
    console.log("selectAllCheckboxes", checkboxContainerId);
    const checkboxes = document
      .getElementById(checkboxContainerId)
      .querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      checkbox.checked = true;
    });
  }

  static deselectAllCheckboxes(checkboxContainerId) {
    console.log("deselectAllCheckboxes", checkboxContainerId);
    const checkboxes = document
      .getElementById(checkboxContainerId)
      .querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
  }

  static setElementValue(elementId, value) {
    const element = document.getElementById(elementId);
    element.value = value;
  }
}

export default ViewHelper;
