class CustomDate extends Date {
  // FIXME: use same config as Date
  constructor(date = new Date()) {
    // if (typeof date === "string") {
    //   date = CustomDate.parse(date);
    // }
    // if (nextDay) {
    //   date.addDays(1);
    // }
    super(date);
  }

  static parse(timeString, nextDay = false) {
    if (timeString.split("T").length > 1) {
      return new CustomDate(timeString);
    }
    const [hour, minute] = timeString.split(":");
    const date = new CustomDate();
    date.setHours(hour, minute);
    if (nextDay) {
      date.addDays(1);
    }
    return date;
  }

  static fromTimePickerString(timeString) {
    const [hour, minute] = timeString.split(":");
    const date = new CustomDate();
    date.setHours(hour, minute);
    return date;
  }

  getDateTimePickerString() {
    const dateTimePickerString = new Date(this);
    dateTimePickerString.setSeconds(0, 0);

    // const res = now.toLocaleString("en-US", {
    //   timeZone: "Europe/Berlin",
    //   year: "numeric",
    //   month: "2-digit",
    //   day: "2-digit",
    //   hour: "2-digit",
    //   minute: "2-digit",
    // });
    dateTimePickerString.setHours(
      dateTimePickerString.getHours() -
        dateTimePickerString.getTimezoneOffset() / 60
    );
    return dateTimePickerString.toISOString().split("Z")[0];
  }

  getTimePickerString() {
    return this.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  getDatePickerString() {
    return this.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  getHoursString(padding = true) {
    return this.toLocaleTimeString("de-DE", {
      hour: "2-digit",
    }).padStart(padding ? 2 : 1, "0");
  }

  getMinutesString(padding = true) {
    return this.toLocaleTimeString("de-DE", {
      minute: "2-digit",
    }).padStart(padding ? 2 : 1, "0");
  }

  getShortDaytimeString() {
    return this.getTimePickerString()
      .split(":")
      .filter((part) => part !== "00")
      .join(":");
  }

  addMinutes(minutes) {
    this.setMinutes(this.getMinutes() + minutes);
    return this;
  }

  addHours(hours) {
    this.setHours(this.getHours() + hours);
    return this;
  }

  addDays(days) {
    this.setDate(this.getDate() + days);
    return this;
  }

  addMinutesCopy(minutes) {
    const newDate = new CustomDate(new Date(this));
    newDate.setMinutes(newDate.getMinutes() + minutes);
    return newDate;
  }

  // timeDifference(endTime) {
  //   return endTime.getTime() - this.getTime();
  // }
}

export default CustomDate;
