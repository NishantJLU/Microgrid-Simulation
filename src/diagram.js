// Interactive SVG Block Diagram Builder matching build_microgrid_r2026a layout

export class SimulinkDiagram {
  constructor(containerId, onSelectBlock) {
    this.container = document.getElementById(containerId);
    this.onSelectBlock = onSelectBlock;
    if (!this.container) {
      console.error(`Diagram container #${containerId} not found.`);
      return;
    }
    this.initSVG();
    this.setupListeners();
  }

  initSVG() {
    this.container.innerHTML = `
      <div class="simulink-sheet">
        <!-- Grid Background Pattern -->
        <svg id="simulink-svg" viewBox="0 0 1000 480" preserveAspectRatio="xMidYMid meet" class="w-full h-full">
          <defs>
            <pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="rgba(255, 255, 255, 0.08)" />
            </pattern>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--text-muted)" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--accent)" />
            </marker>
          </defs>

          <!-- Sheet Grid Background -->
          <rect width="100%" height="100%" fill="url(#dot-grid)" rx="8" />

          <!-- SIGNAL LINES (WIRES) -->
          <!-- Irradiance to PV -->
          <path d="M 90,130 L 130,130" class="wire" marker-end="url(#arrow)" />
          
          <!-- PV to DC-DC -->
          <path d="M 270,130 L 315,130" class="wire" marker-end="url(#arrow)" />
          
          <!-- DC-DC to DC Link -->
          <path d="M 405,130 L 440,130 L 440,325 L 520,325" class="wire" marker-end="url(#arrow)" />
          
          <!-- Vdc feedback loop (DC Link -> Delay -> Sum Vdc_Error) -->
          <path d="M 680,345 L 700,345 L 700,422 L 620,422" class="wire" />
          <path d="M 540,422 L 415,422 L 415,75" class="wire" marker-end="url(#arrow)" />
          
          <!-- Reference Vdc to Sum Vdc_Error -->
          <path d="M 330,60 L 400,60" class="wire" marker-end="url(#arrow)" />
          
          <!-- Vdc Error to Battery Controller -->
          <path d="M 430,60 L 475,60 L 475,70 L 505,70" class="wire" marker-end="url(#arrow)" />
          
          <!-- Controller to Saturation -->
          <path d="M 590,70 L 620,70" class="wire" marker-end="url(#arrow)" />
          
          <!-- Saturation to BESS -->
          <path d="M 700,70 L 730,70" class="wire" marker-end="url(#arrow)" />
          
          <!-- BESS Pbatt to DC Link -->
          <path d="M 870,45 L 890,45 L 890,10 L 600,10 L 600,300" class="wire" marker-end="url(#arrow)" />
 
          <!-- Load Step / Base load sum (Connected directly to Top and Bottom of Sum circle) -->
          <path d="M 90,260 L 140,260 L 140,285" class="wire" marker-end="url(#arrow)" />
          <path d="M 90,345 L 140,345 L 140,315" class="wire" marker-end="url(#arrow)" />
          
          <!-- Sum Load to Inverter -->
          <path d="M 155,300 L 180,300 L 180,215 L 220,215" class="wire" marker-end="url(#arrow)" />

          <!-- Inverter power to DC Link -->
          <path d="M 310,215 L 500,215 L 500,365 L 520,365" class="wire" marker-end="url(#arrow)" />

          <!-- Load & PV & Battery to Grid Sum -->
          <path d="M 180,300 L 180,305 M 180,305 L 180,390 L 800,390 L 800,240" class="wire" marker-end="url(#arrow)" />
          <!-- PV feed-forward to grid -->
          <path d="M 290,130 L 290,180 L 785,180 L 785,220" class="wire" marker-end="url(#arrow)" />
          <!-- BESS feed-forward to grid -->
          <path d="M 820,10 L 920,10 L 920,230 L 815,230" class="wire" marker-end="url(#arrow)" />
          
          <!-- Grid balance sum to Transformer -->
          <path d="M 815,230 L 850,230" class="wire" marker-end="url(#arrow)" />

          <!-- BLOCK RECTANGLES & LABEL GROUPS -->
          
          <!-- Irradiance Step Source -->
          <g class="sim-block" data-block="Irradiance" transform="translate(30, 105)">
            <rect width="60" height="50" rx="3" fill="#fafaf9" stroke="#94a3b8" stroke-width="1.5" />
            <path d="M 10,40 L 30,40 L 30,20 L 50,20" fill="none" stroke="var(--accent)" stroke-width="2" />
            <text x="30" y="-8" text-anchor="middle" class="block-lbl">Irradiance</text>
          </g>

          <!-- PV Array Block -->
          <g class="sim-block" data-block="PV_Array" transform="translate(130, 85)">
            <rect width="140" height="90" rx="4" fill="#fef08a" stroke="#eab308" stroke-width="2" />
            <text x="70" y="42" text-anchor="middle" class="block-title">PV Array</text>
            <text x="70" y="60" text-anchor="middle" class="block-subtitle">60 kW (Rated)</text>
          </g>

          <!-- DC/DC Converter -->
          <g class="sim-block" data-block="DC_DC_Converter" transform="translate(315, 100)">
            <rect width="90" height="60" rx="3" fill="#e2e8f0" stroke="#475569" stroke-width="1.5" />
            <text x="45" y="35" text-anchor="middle" class="block-title" font-size="11">DC/DC</text>
          </g>

          <!-- Vdc Reference -->
          <g class="sim-block" data-block="Vdc_Reference" transform="translate(240, 45)">
            <rect width="90" height="30" rx="3" fill="#f8fafc" stroke="#64748b" stroke-width="1.5" />
            <text x="45" y="20" text-anchor="middle" class="block-title" font-size="10">Vdc_ref (800V)</text>
          </g>

          <!-- Sum Error Block -->
          <g class="sim-block" data-block="Vdc_Error" transform="translate(400, 45)">
            <circle cx="15" cy="15" r="15" fill="#fafaf9" stroke="#475569" stroke-width="1.5" />
            <text x="15" y="20" text-anchor="middle" font-size="16" font-weight="bold" fill="#475569">+</text>
            <text x="5" y="10" text-anchor="middle" font-size="10" fill="#ef4444">-</text>
            <text x="15" y="-8" text-anchor="middle" class="block-lbl">Vdc_Error</text>
          </g>

          <!-- Proportional Controller Gain -->
          <g class="sim-block" data-block="Battery_Controller" transform="translate(505, 45)">
            <polygon points="0,0 85,25 0,50" fill="#e2e8f0" stroke="#475569" stroke-width="1.5" />
            <text x="25" y="30" text-anchor="middle" class="block-title" font-size="11">Kbat</text>
            <text x="42" y="-8" text-anchor="middle" class="block-lbl">Controller</text>
          </g>

          <!-- Battery Power Limit Saturation -->
          <g class="sim-block" data-block="Battery_Power_Limit" transform="translate(620, 45)">
            <rect width="80" height="45" rx="3" fill="#bfdbfe" stroke="#3b82f6" stroke-width="1.5" />
            <path d="M 15,35 L 35,35 L 45,10 L 65,10" fill="none" stroke="#2563eb" stroke-width="2" />
            <text x="40" y="-8" text-anchor="middle" class="block-lbl">Saturation</text>
          </g>

          <!-- BESS (Battery System) -->
          <g class="sim-block" data-block="BESS" transform="translate(730, 25)">
            <rect width="140" height="90" rx="4" fill="#dbeafe" stroke="#2563eb" stroke-width="2" />
            <text x="70" y="42" text-anchor="middle" class="block-title">Battery BESS</text>
            <text x="70" y="60" text-anchor="middle" class="block-subtitle">120 kWh</text>
          </g>

          <!-- Unit Delay Block (Vdc feedback feedback loop breaker) -->
          <g class="sim-block" data-block="Vdc_Feedback_Delay" transform="translate(540, 405)">
            <rect width="80" height="35" rx="3" fill="#e2e8f0" stroke="#475569" stroke-width="1.5" />
            <text x="40" y="22" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11">1 / z</text>
            <text x="40" y="-8" text-anchor="middle" class="block-lbl">Unit Delay</text>
          </g>

          <!-- DC Link Dynamic Model -->
          <g class="sim-block" data-block="DC_Link" transform="translate(520, 300)">
            <rect width="160" height="90" rx="4" fill="#dcfce7" stroke="#16a34a" stroke-width="2" />
            <text x="80" y="42" text-anchor="middle" class="block-title">DC Link</text>
            <text x="80" y="60" text-anchor="middle" class="block-subtitle">Capacitor Cdc</text>
          </g>

          <!-- Base Load Constant -->
          <g class="sim-block" data-block="Base_Load" transform="translate(30, 245)">
            <rect width="60" height="30" rx="3" fill="#f8fafc" stroke="#64748b" stroke-width="1.5" />
            <text x="30" y="20" text-anchor="middle" font-size="10">Base Load</text>
          </g>

          <!-- Load Step Source -->
          <g class="sim-block" data-block="Load_Step" transform="translate(30, 320)">
            <rect width="60" height="50" rx="3" fill="#fafaf9" stroke="#94a3b8" stroke-width="1.5" />
            <path d="M 10,40 L 30,40 L 30,20 L 50,20" fill="none" stroke="var(--accent)" stroke-width="2" />
            <text x="30" y="-8" text-anchor="middle" class="block-lbl">Load Step</text>
          </g>

          <!-- Load Sum Block -->
          <g class="sim-block" data-block="Load" transform="translate(125, 285)">
            <circle cx="15" cy="15" r="15" fill="#e2e8f0" stroke="#475569" stroke-width="1.5" />
            <text x="15" y="20" text-anchor="middle" font-size="16" font-weight="bold" fill="#475569">+</text>
            <text x="15" y="-8" text-anchor="middle" class="block-lbl">Total Load</text>
          </g>

          <!-- Inverter active tracking -->
          <g class="sim-block" data-block="Inverter" transform="translate(220, 185)">
            <rect width="90" height="60" rx="3" fill="#e2e8f0" stroke="#475569" stroke-width="1.5" />
            <text x="45" y="35" text-anchor="middle" class="block-title" font-size="11">Inverter</text>
          </g>

          <!-- Grid Balance Sum Block -->
          <g class="sim-block" data-block="Grid_Power_Balance" transform="translate(775, 205)">
            <circle cx="20" cy="20" r="20" fill="#e2e8f0" stroke="#475569" stroke-width="1.5" />
            <text x="20" y="26" text-anchor="middle" font-size="20" font-weight="bold" fill="#475569">+</text>
            <text x="20" y="-8" text-anchor="middle" class="block-lbl">Grid Sum</text>
          </g>

          <!-- Transformer Gain -->
          <g class="sim-block" data-block="Transformer" transform="translate(850, 200)">
            <rect width="90" height="60" rx="3" fill="#e2e8f0" stroke="#475569" stroke-width="1.5" />
            <text x="45" y="35" text-anchor="middle" class="block-title" font-size="11">Transformer</text>
          </g>
        </svg>
      </div>
    `;
  }

  setupListeners() {
    const blocks = this.container.querySelectorAll('.sim-block');
    blocks.forEach(b => {
      b.addEventListener('click', (e) => {
        // Toggle selected state visual indicators
        blocks.forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');

        const blockId = b.getAttribute('data-block');
        this.onSelectBlock(blockId);
      });
    });
  }
}

// Block Equations & Explanations Metadata Directory
export const BLOCK_METADATA = {
  Irradiance: {
    title: 'Irradiance Step Source',
    equations: 'G(t) = G_{before} \\text{ (t < 5s) } \\rightarrow G_{after} \\text{ (t \\geq 5s)}',
    explanation: 'Models a step change in solar irradiance (typically dropping from 1000 W/m² to 700 W/m² at t=5s) representing passing cloud cover transient.',
    matlabCode: 'add_block(\'simulink/Sources/Step\', [mdl \'/Irradiance\'], ...)'
  },
  PV_Array: {
    title: 'PV Solar Array',
    equations: 'P_{pv} = P_{pv,rated} \\times \\max\\left(0, \\min\\left(1, \\frac{G}{1000}\\right)\\right)',
    explanation: 'Models the power output of a 60 kW solar PV array. Output scales linearly with incoming irradiance G.',
    matlabCode: 'Ppv_rated = 60000;\nPpv = Ppv_rated * max(0, min(1, G/1000));'
  },
  DC_DC_Converter: {
    title: 'DC/DC Converter Boost Regulator',
    equations: 'P_{boost} = P_{pv} \\times \\eta_{boost}',
    explanation: 'An averaged power converter model transferring PV energy directly to the DC Link bus (efficiency modeled as 1.0/Gain = 1).',
    matlabCode: 'add_block(\'simulink/Math Operations/Gain\', [mdl \'/DC_DC_Converter\'], \'Gain\', \'1\');'
  },
  Vdc_Reference: {
    title: 'DC Link Reference Voltage',
    equations: 'V_{dc,ref} = 800\\text{ V}',
    explanation: 'Defines the nominal setpoint voltage for the DC link capacitor bus (e.g. 800V). The battery controller aims to maintain Vdc at this reference.',
    matlabCode: 'add_block(\'simulink/Sources/Constant\', [mdl \'/Vdc_Reference\'], \'Value\', \'Vdc_ref\');'
  },
  Vdc_Error: {
    title: 'Voltage Error Summation',
    equations: 'e_{Vdc}(t) = V_{dc,ref} - V_{dc,feedback}(t)',
    explanation: 'Calculates the deviation between the target DC link voltage reference and the delayed measurement feedback.',
    matlabCode: 'add_block(\'simulink/Math Operations/Sum\', [mdl \'/Vdc_Error\'], \'Inputs\', \'+-\');'
  },
  Battery_Controller: {
    title: 'BESS Charging Controller Proportional Gain',
    equations: 'P_{cmd} = K_{bat} \\times e_{Vdc}',
    explanation: 'A proportional control loop representing the battery dispatcher. If Vdc exceeds Vdc_ref, it commands negative power (charging battery). If Vdc drops, it commands positive power (discharging).',
    matlabCode: 'add_block(\'simulink/Math Operations/Gain\', [mdl \'/Battery_Controller\'], \'Gain\', \'Kbat\');'
  },
  Battery_Power_Limit: {
    title: 'Battery Current/Power Saturation Limit',
    equations: '-P_{bat,max} \\leq P_{batt,sat} \\leq P_{bat,max}',
    explanation: 'Enforces the physical limits of the battery inverter charge and discharge capability (typically saturated to +/- 30 kW).',
    matlabCode: 'add_block(\'simulink/Discontinuities/Saturation\', [mdl \'/Battery_Power_Limit\'], \'UpperLimit\', \'Pbat_max\', \'LowerLimit\', \'-Pbat_max\');'
  },
  BESS: {
    title: 'Battery Energy Storage System (BESS)',
    equations: 'SOC(t) = SOC(t-dt) - P_{cmd} \\frac{dt}{E_{bat,Wh} \\times 3600}\\\\ P_{batt} = P_{cmd}',
    explanation: 'Integrates battery charge/discharge command to track State of Charge (SOC, clamped between 10% and 95%). Positive power discharges the battery, reducing SOC.',
    matlabCode: 'persistent soc\nif isempty(soc), soc = 0.60; end\nsoc = soc - Pcmd*dt/(Ebat_Wh*3600);\nsoc = min(0.95, max(0.10, soc));\nPbatt = Pcmd; SOC = soc;'
  },
  Vdc_Feedback_Delay: {
    title: 'Feedback Unit Delay (Algebraic Loop Breaker)',
    equations: 'V_{dc,feedback}(z) = V_{dc}(z) \\cdot z^{-1}',
    explanation: 'Inserts a single discrete step delay (1ms delay sample) in the feedback loop. This breaks the algebraic loop between DC Link voltage updates and immediate battery charging reactions.',
    matlabCode: 'add_block(\'simulink/Discrete/Unit Delay\', [mdl \'/Vdc_Feedback_Delay\'], \'InitialCondition\', \'Vdc0\', \'SampleTime\', \'1e-3\');'
  },
  DC_Link: {
    title: 'DC Link Bus Capacitor Model',
    equations: '\\frac{dV_{dc}}{dt} = \\frac{P_{pv} + P_{batt} - P_{inv}}{C_{dc} \\times V_{dc}}\\\\ V_{dc}(t) = V_{dc}(t-dt) + dt \\times \\frac{dV_{dc}}{dt}',
    explanation: 'Calculates the DC link voltage using charge balance dynamics. The net power difference between generation (PV + discharging BESS) and load inverter demand charges or discharges the capacitor Cdc.',
    matlabCode: 'persistent v\nif isempty(v), v = 800; end\nv = v + dt*(Ppv + Pbatt - Pinv)/(C*max(v,100));\nv = min(1000,max(500,v));\nVdc = v;'
  },
  Base_Load: {
    title: 'Base Load Power',
    equations: 'P_{base} = 0\\text{ kW}',
    explanation: 'Defines the constant load baseline. Used as the starting summand for load summation.',
    matlabCode: 'add_block(\'simulink/Sources/Constant\', [mdl \'/Base_Load\'], \'Value\', \'0\');'
  },
  Load_Step: {
    title: 'Load Demand Step Source',
    equations: 'P_{step}(t) = P_{before} \\text{ (t < 6s) } \\rightarrow P_{after} \\text{ (t \\geq 6s)}',
    explanation: 'Generates a load increase step at t=6s (typically stepping from 45 kW to 55 kW) to test the transient stability response of the system.',
    matlabCode: 'add_block(\'simulink/Sources/Step\', [mdl \'/Load_Step\'], \'Time\', \'6\', \'Before\', \'45000\', \'After\', \'55000\');'
  },
  Load: {
    title: 'Total System AC Load Summation',
    equations: 'P_{load} = P_{base} + P_{step}',
    explanation: 'Summates the static base load and step load signals to generate the composite microgrid active load curve.',
    matlabCode: 'add_block(\'simulink/Math Operations/Sum\', [mdl \'/Load\'], \'Inputs\', \'++\');'
  },
  Inverter: {
    title: 'Averaged Inverter Power Regulator',
    equations: 'P_{inv} = P_{load} \\times K_{inv}',
    explanation: 'A control-oriented inverter block that matches the AC load demand directly onto the DC Link capacitor bus, scaling by inverter efficiency factor Kinv.',
    matlabCode: 'add_block(\'simulink/Math Operations/Gain\', [mdl \'/Inverter\'], \'Gain\', \'Kinv\');'
  },
  Grid_Power_Balance: {
    title: 'Active Grid Power Balance (Sum)',
    equations: 'P_{grid} = P_{load} - P_{pv} - P_{batt}',
    explanation: 'Summates the total power mismatch. The utility grid automatically absorbs any excess PV generation or supplies any remaining deficit not met by BESS.',
    matlabCode: 'add_block(\'simulink/Math Operations/Sum\', [mdl \'/Grid_Power_Balance\'], \'Inputs\', \'+--\');'
  },
  Transformer: {
    title: 'Transformer Distribution Gain',
    equations: 'P_{grid,trans} = P_{grid} \\times 0.98',
    explanation: 'Scales the grid active power by transformer winding loss factors (98% efficient, Gain = 0.98).',
    matlabCode: 'add_block(\'simulink/Math Operations/Gain\', [mdl \'/Transformer\'], \'Gain\', \'0.98\');'
  }
};
