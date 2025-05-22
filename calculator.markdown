---
layout: page
title: Calculator
permalink: /calculator/
forms:
  - to: to@test.de
    subject: New submission!
    redirect: "#"
    js: "pages/calculator/calculator.js"
    onsubmit: "return calculateChargingCosts(this)"
    # form_engine: js
    placeholders: false
    fields:
      # - name: total_kWh
      #   input_type: number
      #   placeholder: Total kWh
      #   required: true
      # - name: battery_level_start
      #   input_type: number
      #   placeholder: Battery level start
      #   required: true
      # - name: battery_level_end
      #   input_type: number
      #   placeholder: Battery level end
      #   required: true
      - name: charging_total_kwh
        input_type: number
        placeholder: Charging Total kWh
        required: true
      - name: charging_power
        input_type: number
        placeholder: Charging power (kW)
        required: true
      - name: price_per_kwh
        input_type: number
        placeholder: Price per kWh
        required: true
      - name: price_per_min
        input_type: number
        placeholder: Price per minute
        required: true
      # - name: max_price_during_night_duration
      #   input_type: number
      #   placeholder: Max price during night duration
      #   required: true
      # - name: max_price_during_night_cap
      #   input_type: number
      #   placeholder: Max price during night cap
      #   required: true
      - name: total_parking_time
        input_type: number
        placeholder: Total parking time (min)
        required: true
      - name: submit
        input_type: submit
        placeholder: Calculate
        required: true
# <!--
# {% include_relative pages/calculator/calculator.js %}
# {% include_relative pages/calculator/calculator.html %}
# -->
---

<!-- <script src="{{ site.baseurl }}{% link pages/calculator/calculator.js %}" ></script> -->

{% if page.forms[0] %}{% include form.html form="1" %}{% endif %}

<div id="results"></div>

{% include_relative pages/calculator/table.md %}
