# TODO

- [] general

   - [] update RADMEs

- [] tests

   - [] frontend

- [] code logic

   - [] check all calculations
   - [] sync `chargingPower` and `quickChargingPower` // done?
   - [] change presets tariffFilter to AC/DC select
   - [] implement AC/DC switch

- [] improve code quality

   - [] reduce `calculator.js`
   - [] remove unused code
   - [] fix variable naming (use snake_case OR camelCase)
   - [] improve/organize html snippets (components?)

- [] styling

   - [] fix height of inputs in calculator (parking is bigger than the others)

- [] json assets

   - [] move batteryCapacity from `presets.json` to `vehicles.json`
   - [] Renault 5 AC max 11kW

- entfernung eingeben oder aus google maps holen um zu planen wie viel man laden muss
- Entfernung anzeigen nach Berechnung (zumindest bei bekannten Fahrzeugen)
- preconfig

   - nur Daten, die sich selten ändern (zb Fahrzeug.{BatteryCapacity, Connectors}, Anbieter), so dass es fast immer eingeklappt bleiben kann
   - sollte nie **benötigt** werden, nur zum vereinfachen wenn mans mehrfach nutzt oder die Fahrzeug-Daten nicht kennt
   - mit "welche Anbieter hast du", bei tabelle eine collapsed section mit filter (inkl. "nur meine Anbieter")

- maps api: find station provider info
- charging time changed -> update parking time (only if longer) [DONE?]
- vehicle-details
   - AC / DC