#!/usr/bin/env node

/**
 * Test runner script for Charging Calculator
 * This script runs all tests and provides a summary
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.info("🔌 Charging Calculator Test Suite");
console.info("==================================\n");

// Check if Jest is installed
try {
  require.resolve("jest");
} catch (error) {
  console.error("❌ Jest is not installed. Please run: npm install");
  process.exit(1);
}

// Run tests
try {
  console.info("🧪 Running tests...\n");

  const testCommand =
    "npx jest --verbose --coverage --testPathPattern=tests/suits/";
  const output = execSync(testCommand, {
    encoding: "utf8",
    stdio: "pipe",
  });

  console.info(output);

  // Check if coverage directory exists
  const coverageDir = path.join(__dirname, "..", "coverage");
  if (fs.existsSync(coverageDir)) {
    console.info("\n📊 Coverage report generated in ./coverage/");
    console.info(
      "   Open ./coverage/lcov-report/index.html in your browser to view detailed coverage"
    );
  }

  console.info("\n✅ All tests completed successfully!");
} catch (error) {
  console.error("\n❌ Tests failed:");
  console.error(error.stdout || error.message);
  process.exit(1);
}
