/**
 * JsonLoader class for loading JSON data from files
 * Uses require() for Node.js (e.g. for tests) and fetch() for browser
 * Supports both ES6 and CommonJS modules
 * Provides a static method load() for loading JSON data
 * Returns a Promise that resolves to the JSON data
 *
 * NOTE:
 * since we are using require() for tests, fetch() is not used
 * and CAN NOT be covered by tests
 */
class JsonLoader {
  // constructor() {
  //   this.basePath = "/charging-calculator/";
  //   this.assetsPath = "assets/";
  //   this.dataPath = "data/";
  // }

  /**
   * Loads a JSON file from the project root
   * @param {*} jsonPath - The path to the JSON file
   * @returns
   */
  static async load(jsonPath) {
    return await (typeof require !== "undefined"
      ? require("../../../" + jsonPath)
      : fetch("/charging-calculator/" + jsonPath)
          .then((r) => r.json())
          .catch((error) => {
            console.error("Error loading JSON (" + jsonPath + "):", error);
            throw error;
          }));
  }

  /**
   * Loads an asset from the assets folder
   * @param {*} assetPath - The path to the asset file
   * @returns
   */
  static async loadAsset(assetPath) {
    if (typeof require !== "undefined") {
      const path = "../../../assets/" + assetPath;
      return await require(path);
    } else {
      const path = "/charging-calculator/assets/" + assetPath;
      return await fetch(path, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
        .then((r) => r.json())
        .catch((error) => {
          console.error("Error loading asset from JSON (" + path + "):", error);
          throw error;
        });
    }
  }
}

export default JsonLoader;
