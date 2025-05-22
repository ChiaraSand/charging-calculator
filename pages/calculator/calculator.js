function calculateChargingCosts(form) {
  // Prevent the default form submission
  event.preventDefault();
  console.log("Calculating charging costs...");

  const formData = new FormData(form);
  const form_values = Object.fromEntries(formData);
  console.log("form_values", form_values);

  // ...or iterate through the name-value pairs
  // for (var pair of formData.entries()) {
  //   console.log(pair[0] + ": " + pair[1]);
  // }

  const kwh = parseFloat(form_values.charging_total_kwh);
  const chargingPower = parseFloat(form_values.charging_power);
  const pricePerKwh = parseFloat(form_values.price_per_kwh);
  // const duration = parseFloat(form_values.duration);
  const pricePerMin = parseFloat(form_values.price_per_min);
  // const timeCap = parseFloat(form_values.time_cap);
  const totalParkingTime = parseFloat(form_values.total_parking_time);

  const maxPriceDurationCap_duration = parseFloat(
    form_values.max_price_during_night_duration
  );
  const maxPriceDurationCap_cap = parseFloat(
    form_values.max_price_during_night_cap
  );
  // const maxPriceDurationCap = Math.min(maxPriceDurationCap_duration, maxPriceDurationCap_cap);

  const duration = kwh / (chargingPower / 60);
  // const cappedDuration =
  //   maxPriceDurationCap_duration > 0
  //     ? Math.min(duration, maxPriceDurationCap_duration)
  //     : duration;
  const blockingFee = (totalParkingTime - duration) * pricePerMin;
  // const blockingFee =
  //   (totalParkingTime - duration - maxPriceDurationCap_duration) * pricePerMin +
  //   (maxPriceDurationCap_cap > 0
  //     ? Math.min(duration, maxPriceDurationCap_cap) * pricePerMin
  //     : 0);

  const energyCost = kwh * pricePerKwh;
  const timeCost = duration * pricePerMin;
  // const timeCostRaw = duration * pricePerMin;
  // const timeCost = Math.min(timeCostRaw, timeCap || Infinity);
  const totalCost = energyCost + timeCost;

  // effectively cost per kWh and per minute
  const costPerKwh = totalCost / kwh;
  const costPerMin = totalCost / duration;

  document.getElementById("results").innerHTML = `
    <p><strong>⏱️ Dauer:</strong> ${duration.toFixed(2)} min = ${kwh.toFixed(
    2
  )} kWh / ${chargingPower.toFixed(2)} kW</p>
    <p><strong>⚡ kWh-Kosten:</strong> ${energyCost.toFixed(
      2
    )} € = ${pricePerKwh.toFixed(2)} €/kWh * ${kwh.toFixed(2)} kWh</p>
    <p><strong>🕒 Zeitkosten:</strong>
      ${timeCost.toFixed(2)} € = ${duration.toFixed(
    2
  )} min * ${pricePerMin.toFixed(2)} €/min
    </p>
    <p><strong>💰 Gesamtkosten:</strong> ${totalCost.toFixed(
      2
    )} € = ${energyCost.toFixed(2)} € + ${timeCost.toFixed(2)} €</p>
    <p><strong>📈 Effektiv €/kWh:</strong> ${costPerKwh.toFixed(
      2
    )} € = ${energyCost.toFixed(2)} € / ${kwh.toFixed(2)} kWh</p>
    <p>
      <strong>📉 Effektiv €/min:</strong>
      ${costPerMin.toFixed(2)} €/min = ${totalCost.toFixed(
    2
  )} € / ${duration.toFixed(2)} min
    </p>
    <p><strong>🚧 Blocking Fee:</strong> ${blockingFee.toFixed(2)} €</p>
  `;
}
