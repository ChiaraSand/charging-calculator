/**
 * DateTimeHelper class for handling time-related calculations and conversions
 */
class DateTimeHelper {
  /**
   * Calculate the time difference between two time strings
   * @param {string} startTime - Start time in HH:MM format
   * @param {string} endTime - End time in HH:MM format
   * @returns {number} Time difference in minutes
   */
  static calculateTimeDifference(startTime, endTime) {
    // Return 0 if either time is empty
    if (!startTime || !endTime) {
      return 0;
    }

    // Convert time strings to minutes since midnight
    const startMinutes = DateTimeHelper.timeToMinutes(startTime);
    const endMinutes = DateTimeHelper.timeToMinutes(endTime);

    // Handle case where end time is next day
    if (endMinutes < startMinutes) {
      return 24 * 60 - startMinutes + endMinutes;
    }

    return endMinutes - startMinutes;
  }

  /**
   * Convert time string to minutes since midnight
   * @param {string} timeString - Time in HH:MM format
   * @returns {number} Minutes since midnight
   */
  static timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes since midnight to time string
   * @param {number} minutes - Minutes since midnight
   * @returns {string} Time in HH:MM format
   */
  static minutesToTime(minutes) {
    const hours = (Math.floor(minutes / 60) % 24).toString().padStart(2, "0");
    const remainingMinutes = Math.round(minutes % 60)
      .toString()
      .padStart(2, "0");
    return `${hours}:${remainingMinutes}`;
  }

  /**
   * Format time duration for display
   * @param {number} minutes - Duration in minutes
   * @returns {string} Formatted duration string
   */
  static formatDuration(minutes) {
    if (minutes < 60) {
      return Math.round(minutes) + " min";
    } else {
      return `${Math.floor(minutes / 60)}:${Math.round(minutes % 60)
        .toString()
        .padStart(2, "0")} h`;
    }
  }

  /**
   * Get current time in HH:MM format
   * @param {string} locale - Locale for time formatting (default: "de-DE")
   * @returns {string} Current time string
   */
  static getCurrentTimeString(locale = "de-DE") {
    const now = new Date();
    return now.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Add minutes to a time string
   * @param {string} timeString - Base time in HH:MM format
   * @param {number} minutes - Minutes to add
   * @returns {string} New time string
   */
  static addMinutes(timeString, minutes) {
    const totalMinutes = DateTimeHelper.timeToMinutes(timeString) + minutes;
    return DateTimeHelper.minutesToTime(totalMinutes);
  }

  /**
   * Check if a time is within a specific range
   * @param {string} timeString - Time to check in HH:MM format
   * @param {string} startTime - Range start in HH:MM format
   * @param {string} endTime - Range end in HH:MM format
   * @returns {boolean} True if time is within range
   */
  static isTimeInRange(timeString, startTime, endTime) {
    const time = DateTimeHelper.timeToMinutes(timeString);
    const start = DateTimeHelper.timeToMinutes(startTime);
    const end = DateTimeHelper.timeToMinutes(endTime);

    if (start <= end) {
      // Same day range
      return time >= start && time <= end;
    } else {
      // Overnight range
      return time >= start || time <= end;
    }
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = DateTimeHelper;
}
