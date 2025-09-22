/**
 * DateTimeHelper class for handling time-related calculations and conversions
 */
import CustomDate from "./CustomDate.js";

class DateTimeHelper {
  /**
   * Calculate the time difference between two time strings
   * @param {CustomDate} startTime
   * @param {CustomDate} endTime
   * @returns {number} Time difference in minutes
   */
  static calculateTimeDifference(startTime, endTime) {
    // Return 0 if either time is empty
    if (!startTime || !endTime) {
      return 0;
    }

    if (typeof startTime === "string") {
      startTime = CustomDate.fromTimePickerString(startTime);
    }
    if (typeof endTime === "string") {
      endTime = CustomDate.fromTimePickerString(endTime);
    }

    if (endTime < startTime) {
      endTime.addDays(1);
    }

    const diffInMilliseconds = endTime.getTime() - startTime.getTime();
    const diffInMinutes = Math.round(diffInMilliseconds / (1000 * 60));

    return diffInMinutes;
  }

  // /**
  //  * Convert minutes since midnight to time string
  //  * @param {number} minutes - Minutes since midnight
  //  * @returns {string} Time in HH:MM format
  //  */
  // static minutesToTime(minutes) {
  //   const hours = (Math.floor(minutes / 60) % 24).toString().padStart(2, "0");
  //   const remainingMinutes = Math.round(minutes % 60)
  //     .toString()
  //     .padStart(2, "0");
  //   return `${hours}:${remainingMinutes}`;
  // }

  /**
   * Format time duration for display
   * @param {number} minutes - Duration in minutes
   * @returns {string} Formatted duration string
   */
  static formatDuration(minutes) {
    const roundedMinutes = Math.round(minutes);
    if (roundedMinutes < 60) {
      return roundedMinutes + " min";
    } else {
      return `${Math.floor(roundedMinutes / 60)}:${Math.round(
        roundedMinutes % 60
      )
        .toString()
        .padStart(2, "0")} h`;
    }
  }
  static formatDurationAsObject(minutes) {
    const roundedMinutes = Math.round(minutes);
    if (roundedMinutes < 60) {
      return { value: roundedMinutes, unit: "min" };
    } else {
      const value = `${Math.floor(roundedMinutes / 60)}:${Math.round(
        roundedMinutes % 60
      )
        .toString()
        .padStart(2, "0")}`;
      return { value, unit: "h" };
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

  static getCurrentDateTimeString(locale = "de-DE") {
    const now = new CustomDate();
    return now.getDateTimePickerString();
  }
}

export default DateTimeHelper;
