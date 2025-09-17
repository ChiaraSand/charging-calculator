import JsonLoader from "./JsonLoader.js";

class GoogleMapsManager {
  constructor(enableInit = true) {
    this.map = null;
    this.userLocation = null;
    this.chargingStationMarkers = [];
    this.userMarker = null;
    this.enableInit = enableInit;
    this.defaultLocation = { lat: 52.52, lng: 13.405 };
    this.connectorData = {};
    this.loadDataFromJson();
    this.loadHtmlMap();
    this.syncMapEnabled();
  }

  async loadDataFromJson() {
    try {
      const [defaultLocation, connectorData] = await Promise.all([
        JsonLoader.loadAsset("data/default-location.json"),
        JsonLoader.loadAsset("data/connectors.json"),
      ]);

      this.defaultLocation = defaultLocation;
      this.connectorData = connectorData;
    } catch (error) {
      console.error("[GoogleMapsManager] Error loading data from JSON:", error);
    }
  }

  async initializeMap(mapElementId) {
    const defaultLocation = this.defaultLocation;

    document
      .getElementById("toggleEnableMap")
      .addEventListener("click", () => this.toggleMapEnabled());

    this.syncMapEnabled();

    document.getElementById("toggleEnableMap").innerHTML = this.enable
      ? "Disable Map"
      : "Enable Map";

    this.hideApiKeyError();

    if (!this.enable) {
      this.showMapDisabledMessage();
      this.hideMapContainer();
      this.hideMapError();
      console.warn("map disabled");
      return;
    } else {
      this.hideMapDisabledMessage();
      this.showElement("mapContainer", "block");
      this.hideMapError();
    }

    this.hideNoStationsMessage();
    this.showMapLoadingIndicator();

    await this.loadGoogleMapsApi();
    // .catch((error) => {
    //   console.error("Error loading Google Maps API:", error);
    //   this.showApiKeyError();
    //   this.setMapEnabledFromUser(false);
    //   return;
    // });

    if (!this.enable) {
      return;
    }

    this.map = new google.maps.Map(document.getElementById(mapElementId), {
      zoom: 12,
      center: defaultLocation,
      mapId: "DEMO_MAP_ID", // Required for AdvancedMarkerElement
    });

    try {
      const userLocation = await this.getCurrentLocation();
      this.findRealChargingStations(userLocation);
    } catch (error) {
      console.warn("Could not get current location, using default location");
      this.findRealChargingStations(defaultLocation);
    }

    this.hideMapLoadingIndicator();

    // Add resize event listener to refresh map when resized
    const mapElement = document.getElementById(mapElementId);
    if (mapElement) {
      let resizeTimeout;
      mapElement.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          if (this.map) {
            google.maps.event.trigger(this.map, "resize");
          }
        }, 100);
      });
    }

    document
      .getElementById("locateMe")
      .addEventListener("click", () => this.mapsManager.locateUser());
    document
      .getElementById("refreshStations")
      .addEventListener("click", () =>
        this.mapsManager.refreshChargingStations()
      );
  }

  loadHtmlMap() {
    $("#maps-section").load("./maps.html");
  }

  // Loads Google Maps JS API with places and marker libraries via <script> tag
  loadGoogleMapsApi() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }
      if (document.getElementById("google-maps-script")) {
        // Already loading
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkLoaded);
            resolve();
          }
        }, 50);
        return;
      }
      const apiKey = this.getApiKey();
      if (!apiKey) {
        this.showApiKeyError();
        this.setMapEnabledFromUser(false);
        // this.enable = false;
        reject(new Error("Google Maps API key not configured"));
        return;
      }
      const script = document.createElement("script");
      script.id = "google-maps-script";
      // TODO: add loading=async
      // https://developers.google.com/maps/documentation/javascript/load-maps-js-api#direct_script_loading_url_parameters
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker`;
      script.async = true;
      script.onload = () => {
        resolve();
      };
      script.onerror = (e) => {
        // this.setMapEnabledFromUser(false);
        this.enable = false;
        if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
          this.showApiKeyError();
          // reject(new Error("Google Maps API key not configured"));
          reject("Google Maps API key not configured");
        } else {
          this.showElement("mapError");
          reject(new Error("Failed to load Google Maps API"));
        }
      };
      document.head.appendChild(script);
    });
  }

  getApiKey() {
    // Try to get API key from multiple sources
    const secrets = JSON.parse(
      localStorage.getItem("charging-calculator") || "{}"
    );

    // Check if user has provided their own API key
    if (
      secrets.googleMapsApiKey &&
      secrets.googleMapsApiKey !== "YOUR_API_KEY_HERE"
    ) {
      return secrets.googleMapsApiKey;
    }

    // Check for environment variable (for build-time injection)
    if (typeof window !== "undefined" && window.GOOGLE_MAPS_API_KEY) {
      return window.GOOGLE_MAPS_API_KEY;
    }

    // ask in popup to enter API key
    const apiKey = this.askForApiKey();
    if (apiKey) {
      return apiKey;
    }

    this.showApiKeyError();

    // Fallback to placeholder - will show error message
    return undefined; //"YOUR_API_KEY_HERE";
  }

  askForApiKey() {
    const current = JSON.parse(localStorage.getItem("charging-calculator"));
    const apiKey = prompt("Please enter your Google Maps API key");
    if (apiKey) {
      localStorage.setItem(
        "charging-calculator",
        JSON.stringify({ ...current, googleMapsApiKey: apiKey })
      );
      return apiKey;
    }
  }

  syncMapEnabled() {
    const userEnabled = this.getMapEnabledFromUser();
    if (userEnabled === undefined) {
      // set localStorage state if user has not set it
      this.setMapEnabledFromUser(this.enableInit);
      this.enable = this.enableInit;
    } else {
      // use localStorage state if user has set it
      this.enable = userEnabled;
    }

    // document.getElementById("toggleEnableMap").innerHTML = this.enable
    //   ? "Disable Map"
    //   : "Enable Map";
  }

  toggleMapEnabled() {
    this.enable = !this.enable;
    this.setMapEnabledFromUser(this.enable);
    // Reload only maps.html after click on button
    window.location.reload();
  }

  getMapEnabledFromUser() {
    const secrets = JSON.parse(
      localStorage.getItem("charging-calculator") || "{}"
    );
    return secrets.enableMap;
  }

  setMapEnabledFromUser(enable) {
    const current = JSON.parse(localStorage.getItem("charging-calculator"));
    localStorage.setItem(
      "charging-calculator",
      JSON.stringify({ ...current, enableMap: enable })
    );
  }

  async getCurrentLocation() {
    if (!this.enable) {
      return;
    }
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            this.userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            this.map.setCenter(this.userLocation);
            this.map.setZoom(15);

            // Add user location marker
            const userMarkerElement = document.createElement("div");
            userMarkerElement.innerHTML = `
              <div class="map-location-marker">
                <div class="map-location-marker-inner"></div>
              </div>
            `;

            this.userMarker = new google.maps.marker.AdvancedMarkerElement({
              position: this.userLocation,
              map: this.map,
              title: "Ihre Position",
              content: userMarkerElement,
            });

            this.hideElement("mapError");
            resolve(this.userLocation);
          },
          (error) => {
            this.showElement("mapError");
            console.error("Geolocation error:", error);
            reject(error);
          }
        );
      } else {
        this.showElement("mapError");
        reject(new Error("Geolocation not supported"));
      }
    });
  }

  async findRealChargingStations(location) {
    if (!this.enable) {
      return;
    }
    try {
      const { Place } = await google.maps.importLibrary("places");
      const { spherical } = await google.maps.importLibrary("geometry");
      // geometry library is not included by default, so we need to check and load it

      // if (!google.maps.geometry) {
      //   // geometry is not a separate library in the script tag, but is included if 'geometry' is in libraries param
      //   // so we can just check for it
      //   throw new Error("Google Maps geometry library not loaded.");
      //   const geometry = google.maps.geometry;
      // }
      // const Place = google.maps.places.Place;
      // const spherical = google.maps.geometry.spherical;

      const bounds = this.map.getBounds();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const diameter = spherical.computeDistanceBetween(ne, sw);
      const cappedRadius = Math.min(diameter / 2, 50000); // Radius cannot be more than 50000.

      const request = {
        includedTypes: ["electric_vehicle_charging_station"],
        maxResultCount: 20, // 1-20
        locationRestriction: {
          center: location,
          radius: cappedRadius,
        },
        rankPreference: "DISTANCE",
        fields: [
          "displayName",
          "evChargeOptions",
          "googleMapsURI",
          "location",
          "websiteURI",
          "addressComponents",
          "paymentOptions",
        ],
      };

      const { places } = await Place.searchNearby(request);

      if (places && places.length > 0) {
        // Filter for EV charging stations and add them to map
        // const evStations = places;
        // .filter(
        //   (place) =>
        //     place.displayName.toLowerCase().includes("charging") ||
        //     place.displayName.toLowerCase().includes("ev") ||
        //     place.displayName.toLowerCase().includes("electric") ||
        //     place.types.includes("electric_vehicle_charging_station")
        // );

        // if (evStations.length === 0) {
        //   this.showNoStationsMessage();
        // } else {
        this.hideNoStationsMessage();
        this.addStationsToMap(places);
        // }
      } else {
        console.warn("No charging stations found");
        this.showNoStationsMessage();
      }
    } catch (error) {
      console.error("Error finding charging stations:", error);
    }
  }

  addStationsToMap(stations) {
    stations.forEach((station) => {
      // Handle both Google Places data and our custom station data
      const position =
        station.geometry && station.geometry.location
          ? {
              lat: station.geometry.location.lat(),
              lng: station.geometry.location.lng(),
            }
          : station.location || {
              lat: station.lat,
              lng: station.lng,
            };
      const name = station.name || station.displayName || "Charging Station";
      const address =
        station.vicinity || station.formattedAddress || "Address not available";

      // evChargeOptions:  {
      //     "connectorCount": 6,
      //     "connectorAggregations": [
      //         {
      //             "type": "CCS_COMBO_2",
      //             "maxChargeRateKw": 300,
      //             "count": 4,
      //             "availableCount": 2,
      //             "outOfServiceCount": 0,
      //             "availabilityLastUpdateTime": "2025-09-07T12:20:00.000Z"
      //         },
      //         {
      //             "type": "CHADEMO",
      //             "maxChargeRateKw": 100,
      //             "count": 2,
      //             "availableCount": 2,
      //             "outOfServiceCount": 0,
      //             "availabilityLastUpdateTime": "2025-09-07T12:20:00.000Z"
      //         }
      //     ]
      // }
      const chargingConnectors =
        station.evChargeOptions?.connectorAggregations || [];

      // Extract connector types from the API data
      const availableConnectorTypes =
        this.extractConnectorTypes(chargingConnectors);

      // Determine station type and power based on name or use defaults
      let stationMaxPower = Math.max(
        ...chargingConnectors.map((connector) => connector.maxChargeRateKw)
      );

      let stationAvailabilePorts = chargingConnectors.reduce(
        (acc, connector) => acc + connector.availableCount,
        0
      );
      let stationTotalPorts = chargingConnectors.reduce(
        (acc, connector) => acc + connector.count,
        0
      );

      // FIXME
      let stationType = "N/A";

      const stationPowerLevel = {
        11: {
          color: "#800000", // red
          symbol: "⚡️",
          label: "11kW",
        },
        22: {
          color: "#800000", // red
          symbol: "⚡️⚡️",
          label: "22kW",
        },
        50: {
          color: "#ffa500", // orange
          symbol: "⚡️⚡️⚡️",
          label: "50kW",
        },
        100: {
          color: "#ffff00", // yellow
          symbol: "⚡️⚡️⚡️⚡️",
          label: "100kW",
        },
        300: {
          color: "#008000", // green
          symbol: "⚡️⚡️⚡️⚡️⚡️",
          label: "200kW",
        },
        default: {
          color: "#6b7280",
          symbol: "?",
          label: "N/A",
        },
      };

      // Create marker element
      const markerElement = document.createElement("div");
      markerElement.innerHTML = `
        <div class="map-station-marker" style="
          background: ${
            stationPowerLevel[Math.round(stationMaxPower)]?.color ||
            stationPowerLevel.default.color
          };
        ">
          ${stationMaxPower}<br/>
          ${stationAvailabilePorts} / ${stationTotalPorts}
        </div>
      `;

      // Use AdvancedMarkerElement if available, else fallback to Marker
      let marker;
      if (
        google.maps.marker &&
        typeof google.maps.marker.AdvancedMarkerElement === "function"
      ) {
        marker = new google.maps.marker.AdvancedMarkerElement({
          position: position,
          map: this.map,
          title: name,
          content: markerElement,
        });
      } else {
        marker = new google.maps.Marker({
          position: position,
          map: this.map,
          title: name,
        });
      }

      const availableConnectorTypesHtml =
        availableConnectorTypes.length > 0
          ? `<div>
          <div class="map-station-info-window-connector-types">
            ${availableConnectorTypes.map(
              (connector) =>
                `<span class="map-station-info-window-connector-type">${connector}</span>`
            )}
          </div>
        </div>`
          : "";

      const availableTariffs = this.getAvailableTariffsForStation({
        type: stationType,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
                    <div id="map-station-info-window" class="map-station-info-window">
                        <div class="map-station-info-window-header">
                          <h3 class="map-station-info-window-headline">${name}</h3>
                          <div class="map-station-info-window-links">
                            ${
                              station.googleMapsURI
                                ? `
                          <a href="${station.googleMapsURI}" target="_blank" class="map-station-info-window-link map-station-info-window-link-maps">
                              <i class="fas fa-map-marker-alt"></i>
                            </a>
                            `
                                : ""
                            }
                            ${
                              station.websiteURI
                                ? `
                                <a href="${station.websiteURI}" target="_blank" class="map-station-info-window-link map-station-info-window-link-website">
                                  <i class="fas fa-globe"></i>
                                </a>
                                `
                                : ""
                            }
                          </div>
                        </div>
                        ${availableConnectorTypesHtml}
                        <div class="map-station-info-window-section">
                          <p style="margin: 4px 0;"><strong>Adresse:</strong> ${this.getFullAddress(
                            station
                          )}</p>
                          <p style="margin: 4px 0;"><strong>Max. Leistung:</strong> ${stationMaxPower} kW</p>
                        </div>

                        ${
                          chargingConnectors.length > 0
                            ? `<div class="map-station-info-window-section">
                              <h4>Verfügbare Leistungen:</h4>
                              <ul style="padding-left: 16px;">
                                ${chargingConnectors
                                  .map(
                                    (connector) => `
                                  <li>${this.mapConnectorType(
                                    connector.type
                                  )}: ${connector.maxChargeRateKw} kW (${
                                      connector.availableCount
                                    }/${
                                      connector.count
                                    } [${this.getRelativeTime(
                                      connector.availabilityLastUpdateTime
                                    )}])</li>
                                `
                                  )
                                  .join("")}
                              </ul>
                            </div>`
                            : ""
                        }
                        ${
                          availableTariffs.length > 0
                            ? `<div class="map-station-info-window-section">
                              <h4>Verfügbare Tarife:</h4>
                              <ul style="padding-left: 16px;">
                                  ${availableTariffs
                                    .map(
                                      (tariff) =>
                                        `<li>${
                                          tariff.name
                                        }: ${tariff.pricePerKwh.toFixed(
                                          2
                                        )} €/kWh</li>`
                                    )
                                    .join("")}
                              </ul>
                            </div>`
                            : ""
                        }
                    </div>
                `,
      });

      marker.addListener("click", () => {
        infoWindow.open(this.map, marker);
      });

      this.chargingStationMarkers.push(marker);
    });
  }

  getAvailableTariffsForStation(station) {
    // This method should be called from the main calculator class
    // For now, return empty array - will be set by the main class
    return this.availableTariffs
      ? this.availableTariffs.filter((tariff) => {
          if (station.type === "DC") {
            return tariff.type === "DC";
          } else if (station.type === "AC") {
            return tariff.type === "AC";
          }
          return true;
        })
      : [];
  }

  setAvailableTariffs(tariffs) {
    this.availableTariffs = tariffs;
  }

  extractConnectorTypes(connectorAggregations) {
    if (!connectorAggregations) {
      return [];
    }

    const connectorTypes = [];

    connectorAggregations.forEach((aggregation) => {
      if (aggregation.type) {
        // Map Google Places API connector types to our internal types
        const mappedType = this.mapConnectorType(aggregation.type);
        if (mappedType && !connectorTypes.includes(mappedType)) {
          connectorTypes.push(mappedType);
        }
      }
    });

    return connectorTypes;
  }

  mapConnectorType(googleType) {
    // Build type mapping from connector data
    const typeMapping = {};

    if (this.connectorData.connectors) {
      this.connectorData.connectors.forEach((connector) => {
        // Add main mapping
        typeMapping[connector.id] = connector.name;

        // Add aliases
        connector.aliases.forEach((alias) => {
          typeMapping[alias] = connector.name;
        });
      });
    }

    // Fallback mapping if no data loaded
    if (Object.keys(typeMapping).length === 0) {
      typeMapping.TYPE_1 = "Type 1 (J1772)";
      typeMapping.TYPE_2 = "Type 2 (Mennekes)";
      typeMapping.CCS_1 = "CCS 1";
      typeMapping.CCS_2 = "CCS 2";
      typeMapping.CHAdeMO = "CHAdeMO";
      typeMapping.TESLA = "Tesla Supercharger";
      typeMapping.SCHUKO = "Schuko";
      typeMapping.J1772 = "Type 1 (J1772)";
      typeMapping.MENNEKES = "Type 2 (Mennekes)";
      typeMapping.IEC_62196_T1 = "Type 1 (J1772)";
      typeMapping.IEC_62196_T2 = "Type 2 (Mennekes)";
      typeMapping.IEC_62196_T1_COMBO = "CCS 1";
      typeMapping.IEC_62196_T2_COMBO = "CCS 2";
    }

    return typeMapping[googleType] || googleType;
  }

  showNoStationsMessage() {
    const messageElement = document.getElementById("noStationsMessage");
    if (messageElement) {
      messageElement.style.display = "block";
    }
  }

  hideNoStationsMessage() {
    const messageElement = document.getElementById("noStationsMessage");
    if (messageElement) {
      messageElement.style.display = "none";
    }
  }

  locateUser() {
    this.getCurrentLocation().catch((error) => {
      alert(
        "Standort konnte nicht ermittelt werden. Bitte erlauben Sie den Zugriff auf Ihren Standort."
      );
    });
  }

  refreshChargingStations() {
    // Clear existing markers
    this.chargingStationMarkers.forEach((marker) => (marker.map = null));
    this.chargingStationMarkers = [];

    // Hide no stations message
    this.hideNoStationsMessage();

    // Show loading animation
    const button = document.getElementById("refreshStations");
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aktualisiere...';
    button.disabled = true;

    // Add new stations around current map center or user location
    const center = this.map.getCenter();

    // Find real charging stations around current map center
    this.findRealChargingStations(center);

    setTimeout(() => {
      button.innerHTML = originalText;
      button.disabled = false;
    }, 1000);
  }

  getFullAddress(station) {
    if (station.formatted_address) {
      return station.formatted_address;
    }
    if (!station.addressComponents) {
      return "N/A";
    }
    const address =
      station.addressComponents[1]?.Gg +
      " " +
      station.addressComponents[0]?.Gg +
      ", " +
      station.addressComponents[8]?.Gg +
      " " +
      station.addressComponents[3]?.Gg;
    return address;
  }

  getRelativeTime(timestamp) {
    const now = new Date();
    const ts = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    const diffMs = now - ts;
    let relativeTime;
    if (isNaN(diffMs) || !timestamp) {
      relativeTime = "unbekannt";
    } else if (diffMs < 60000) {
      relativeTime = "vor wenigen Sekunden";
    } else if (diffMs < 3600000) {
      const mins = Math.floor(diffMs / 60000);
      relativeTime = `vor ${mins} Min.`;
    } else if (diffMs < 86400000) {
      const hours = Math.floor(diffMs / 3600000);
      relativeTime = `vor ${hours}h`;
    } else {
      const days = Math.floor(diffMs / 86400000);
      relativeTime = `vor ${days}d`;
    }
    return relativeTime;
  }

  showElement(elementId, display = "flex") {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = display;
    }
  }

  hideElement(elementId, display = "none") {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = display;
    }
  }

  showMapError(message = "Something went wrong.") {
    const messageElement = document.getElementById("mapError");
    if (messageElement) {
      messageElement.style.display = "flex";
      messageElement.querySelector("p").textContent = message;
    }
  }
  hideMapError() {
    this.hideElement("mapError");
  }

  showMapLoadingIndicator() {
    this.showElement("mapLoading");
  }

  hideMapLoadingIndicator() {
    this.hideElement("mapLoading");
  }

  showMapDisabledMessage() {
    this.showElement("mapDisabled");
  }

  hideMapDisabledMessage() {
    this.hideElement("mapDisabled");
  }

  showApiKeyError() {
    this.showElement("apiKeyError");
  }

  hideApiKeyError() {
    this.hideElement("apiKeyError");
  }

  showMapContainer() {
    this.showElement("mapContainer");
  }

  hideMapContainer() {
    this.hideElement("mapContainer");
  }
}

export default GoogleMapsManager;
