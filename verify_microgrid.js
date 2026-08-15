// Microgrid Simulation Automated Verification & Tests

import { runSimulinkSolver } from './src/solver.js';
import { BLOCK_METADATA } from './src/diagram.js';

// Default parameters mapping matching Simulink baseline
const defaultParams = {
  Ppv_rated: 60000,
  Vdc_ref: 800,
  Cdc: 0.02,
  Pbat_max: 30000,
  Ebat_Wh: 120000,
  SOC0: 0.60,
  Vdc0: 800,
  Kbat: 250,
  Kinv: 1.0,
  Tsim: 10,
  dt: 0.001,
  solarStepTime: 5.0,
  solarStepBefore: 1000,
  solarStepAfter: 700,
  loadStepTime: 6.0,
  loadStepBefore: 45000,
  loadStepAfter: 55000
};

console.log("==========================================");
console.log("   SIMUGRID LAB AUTOMATED VERIFICATION    ");
console.log("==========================================\n");

let testsPassed = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------
// TEST 1: Baseline Solver Run & Downsampling
// ----------------------------------------------------
try {
  const result = runSimulinkSolver(defaultParams);
  const { traces, metrics } = result;

  assert(traces.time.length === 201, `Solver downsampling holds 201 points (got ${traces.time.length})`);
  assert(traces.vdc[0] === 800, `Initial Vdc is exactly Vdc0 = 800V (got ${traces.vdc[0]}V)`);
  assert(metrics.socFinal > 0.55 && metrics.socFinal < 0.65, `Final battery SOC remains within reasonable bounds: ${(metrics.socFinal * 100).toFixed(2)}%`);
  
  // PV Power test (should step from 60kW to 42kW after 5s)
  const idxBefore5s = traces.time.indexOf("4.00");
  const idxAfter5s = traces.time.indexOf("6.00");
  if (idxBefore5s !== -1 && idxAfter5s !== -1) {
    assert(traces.ppv[idxBefore5s] === 60, `PV output is 60kW before irradiance step (got ${traces.ppv[idxBefore5s]}kW)`);
    assert(traces.ppv[idxAfter5s] === 42, `PV output is 42kW after irradiance step (got ${traces.ppv[idxAfter5s]}kW)`);
  } else {
    assert(false, "Could not find time stamps 4.00s and 6.00s in traces");
  }
} catch (err) {
  assert(false, `Baseline solver failed to run: ${err.message}`);
}

// ----------------------------------------------------
// TEST 2: Capacitance Parametric Transient Effects
// ----------------------------------------------------
try {
  // Lower Cdc = larger voltage fluctuations (lower minimum Vdc)
  const resLargeC = runSimulinkSolver({ ...defaultParams, Cdc: 0.05 });
  const resSmallC = runSimulinkSolver({ ...defaultParams, Cdc: 0.005 });

  console.log(`\nCdc capacitance transient comparison:`);
  console.log(`  - Large Capacitance (0.05 F) - Min Vdc drop: ${resLargeC.metrics.vdcMin.toFixed(2)} V`);
  console.log(`  - Small Capacitance (0.005 F) - Min Vdc drop: ${resSmallC.metrics.vdcMin.toFixed(2)} V`);

  assert(resSmallC.metrics.vdcMin < resLargeC.metrics.vdcMin, "Lower Cdc results in larger transient voltage drop");
} catch (err) {
  assert(false, `Capacitance transient test failed: ${err.message}`);
}

// ----------------------------------------------------
// TEST 3: Controller Gain Stabilization Speed
// ----------------------------------------------------
try {
  // Higher gain Kbat = tighter regulation, smaller Vdc dip
  const resLowGain = runSimulinkSolver({ ...defaultParams, Kbat: 100 });
  const resHighGain = runSimulinkSolver({ ...defaultParams, Kbat: 500 });

  console.log(`\nController Proportional Gain transient comparison:`);
  console.log(`  - Low Gain (100 W/V) - Min Vdc: ${resLowGain.metrics.vdcMin.toFixed(2)} V`);
  console.log(`  - High Gain (500 W/V) - Min Vdc: ${resHighGain.metrics.vdcMin.toFixed(2)} V`);

  assert(resHighGain.metrics.vdcMin > resLowGain.metrics.vdcMin, "Higher Kbat loop gain stabilizes DC Link with smaller voltage drop");
} catch (err) {
  assert(false, `Controller gain test failed: ${err.message}`);
}

// ----------------------------------------------------
// TEST 4: Block Diagram Metadata Mapping Check
// ----------------------------------------------------
const requiredBlocks = [
  'Irradiance', 'PV_Array', 'DC_DC_Converter', 'Vdc_Reference', 
  'Vdc_Error', 'Battery_Controller', 'Battery_Power_Limit', 'BESS', 
  'Vdc_Feedback_Delay', 'DC_Link', 'Base_Load', 'Load_Step', 
  'Load', 'Inverter', 'Grid_Power_Balance', 'Transformer'
];

console.log(`\nChecking block diagram interactive metadata:`);
let metadataIntact = true;
requiredBlocks.forEach(bId => {
  if (!BLOCK_METADATA[bId]) {
    metadataIntact = false;
    console.error(`  - Missing metadata for block ID: ${bId}`);
  }
});
assert(metadataIntact, "All interactive diagram blocks have corresponding mathematical definitions in BLOCK_METADATA");

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log("\n==========================================");
console.log(` Verification Completed: ${testsPassed} / ${totalTests} Tests Passed`);
console.log("==========================================");
