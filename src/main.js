// SimuGrid Lab main coordinator

import { runSimulinkSolver } from './solver.js';
import { SimulinkDiagram, BLOCK_METADATA } from './diagram.js';

// Configuration parameters state
const params = {
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

let scopeChart = null;
let diagram = null;

// DOM Registers
const DOM = {
  // Sliders
  sliderPpvRated: document.getElementById('slider-ppv-rated'),
  sliderVdcRef: document.getElementById('slider-vdc-ref'),
  sliderCdc: document.getElementById('slider-cdc'),
  sliderPbatMax: document.getElementById('slider-pbat-max'),
  sliderEbatWh: document.getElementById('slider-ebat-wh'),
  sliderSoc0: document.getElementById('slider-soc0'),
  sliderKbat: document.getElementById('slider-kbat'),
  sliderSolarStepTime: document.getElementById('slider-solar-step-time'),
  sliderLoadStepTime: document.getElementById('slider-load-step-time'),

  // Labels
  lblPpvRated: document.getElementById('lbl-ppv-rated'),
  lblVdcRef: document.getElementById('lbl-vdc-ref'),
  lblCdc: document.getElementById('lbl-cdc'),
  lblPbatMax: document.getElementById('lbl-pbat-max'),
  lblEbatWh: document.getElementById('lbl-ebat-wh'),
  lblSoc0: document.getElementById('lbl-soc0'),
  lblKbat: document.getElementById('lbl-kbat'),
  lblSolarStepTime: document.getElementById('lbl-solar-step-time'),
  lblLoadStepTime: document.getElementById('lbl-load-step-time'),

  // Action / Progress
  btnRun: document.getElementById('btn-run-simulation'),
  progressContainer: document.getElementById('solver-progress-container'),
  progressFill: document.getElementById('solver-progress-fill'),

  // Scope metrics display
  lblVdcMinMax: document.getElementById('lbl-vdc-min-max'),
  lblSocFinal: document.getElementById('lbl-soc-final'),
  lblPbatPeak: document.getElementById('lbl-pbat-peak'),
  lblGridEnergyNet: document.getElementById('lbl-grid-energy-net'),

  // Equations Drawer
  emptyState: document.getElementById('details-empty-state'),
  detailsContent: document.getElementById('details-content-panel'),
  detailsTitle: document.getElementById('details-title'),
  detailsExplanation: document.getElementById('details-explanation'),
  detailsEquation: document.getElementById('details-equation'),
  detailsMatlab: document.getElementById('details-matlab')
};

window.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize custom block diagram SVG
  diagram = new SimulinkDiagram('diagram-container', onSelectBlock);

  // 2. Initialize Scope Chart.js instance
  initScopeChart();

  // 3. Register Event Listeners
  setupEventListeners();

  // 4. Run initial solver execution automatically to show baseline transients
  runSolverWithProgress();
});

// Setup parameter change ranges triggers
function setupEventListeners() {
  // PV Rated
  DOM.sliderPpvRated.addEventListener('input', (e) => {
    params.Ppv_rated = parseInt(e.target.value, 10) * 1000;
    DOM.lblPpvRated.textContent = `${e.target.value} kW`;
  });

  // Vdc Ref
  DOM.sliderVdcRef.addEventListener('input', (e) => {
    params.Vdc_ref = parseInt(e.target.value, 10);
    DOM.lblVdcRef.textContent = `${e.target.value} V`;
  });

  // DC Link Cdc
  DOM.sliderCdc.addEventListener('input', (e) => {
    params.Cdc = parseFloat(e.target.value);
    DOM.lblCdc.textContent = `${params.Cdc.toFixed(3)} F`;
  });

  // Battery Pbat Max
  DOM.sliderPbatMax.addEventListener('input', (e) => {
    params.Pbat_max = parseInt(e.target.value, 10) * 1000;
    DOM.lblPbatMax.textContent = `${e.target.value} kW`;
  });

  // Battery Ebat Wh
  DOM.sliderEbatWh.addEventListener('input', (e) => {
    params.Ebat_Wh = parseInt(e.target.value, 10) * 1000;
    DOM.lblEbatWh.textContent = `${e.target.value} kWh`;
  });

  // Initial SOC0
  DOM.sliderSoc0.addEventListener('input', (e) => {
    params.SOC0 = parseFloat(e.target.value) / 100;
    DOM.lblSoc0.textContent = `${e.target.value}%`;
  });

  // Controller Gain Kbat
  DOM.sliderKbat.addEventListener('input', (e) => {
    params.Kbat = parseInt(e.target.value, 10);
    DOM.lblKbat.textContent = `${params.Kbat} W/V`;
  });

  // Solar Step Time
  DOM.sliderSolarStepTime.addEventListener('input', (e) => {
    params.solarStepTime = parseFloat(e.target.value);
    DOM.lblSolarStepTime.textContent = `${params.solarStepTime.toFixed(1)} s`;
  });

  // Load Step Time
  DOM.sliderLoadStepTime.addEventListener('input', (e) => {
    params.loadStepTime = parseFloat(e.target.value);
    DOM.lblLoadStepTime.textContent = `${params.loadStepTime.toFixed(1)} s`;
  });

  // Run Simulation Click
  DOM.btnRun.addEventListener('click', runSolverWithProgress);
}

// Simulink Block click callback
function onSelectBlock(blockId) {
  const meta = BLOCK_METADATA[blockId];
  if (!meta) return;

  // Swap empty state with details panel content
  DOM.emptyState.style.display = 'none';
  DOM.detailsContent.style.display = 'block';

  DOM.detailsTitle.textContent = meta.title;
  DOM.detailsExplanation.textContent = meta.explanation;
  
  // Format math formula (renders subscripts and symbols clearly)
  DOM.detailsEquation.innerHTML = formatMathHtml(meta.equations);
  DOM.detailsMatlab.textContent = meta.matlabCode;
}

// Simple latex-to-html layout helper
function formatMathHtml(latex) {
  return latex
    .replace(/\\text\{([^}]+)\}/g, '<span style="font-family:sans-serif;">$1</span>')
    .replace(/\\max/g, 'max')
    .replace(/\\min/g, 'min')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\times/g, ' &times; ')
    .replace(/\\leq/g, ' &le; ')
    .replace(/\\geq/g, ' &ge; ')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<div class="math-frac"><span class="math-num">$1</span><span>$2</span></div>')
    .replace(/\\bar\{([^}]+)\}/g, '<span style="text-decoration:overline;">$1</span>')
    .replace(/\\\\/g, '<br>')
    .replace(/_/g, '');
}

// Simulate hardware step computation progress bar
function runSolverWithProgress() {
  DOM.btnRun.disabled = true;
  DOM.progressContainer.style.display = 'block';
  DOM.progressFill.style.width = '0%';

  let progress = 0;
  const interval = setInterval(() => {
    progress += 20;
    DOM.progressFill.style.width = `${progress}%`;

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        DOM.progressContainer.style.display = 'none';
        DOM.btnRun.disabled = false;
        
        // Execute solver calculation in JS
        const results = runSimulinkSolver(params);
        updateScope(results);
      }, 100);
    }
  }, 80); // takes ~400ms to resolve visually
}

// Plot scope data & update measurement labels
function updateScope(results) {
  const tr = results.traces;
  const mt = results.metrics;

  // 1. Update scoreboard displays
  DOM.lblVdcMinMax.textContent = `${mt.vdcMin.toFixed(1)} V / ${mt.vdcMax.toFixed(1)} V`;
  DOM.lblSocFinal.textContent = `${(mt.socFinal * 100).toFixed(2)}%`;
  
  // Find battery peak power output (max absolute power in BESS trace)
  let peakPbat = 0;
  tr.pbat.forEach(p => {
    if (Math.abs(p) > peakPbat) peakPbat = Math.abs(p);
  });
  DOM.lblPbatPeak.textContent = `${peakPbat.toFixed(1)} kW`;

  // Grid net format
  DOM.lblGridEnergyNet.textContent = mt.gridEnergyKwh < 0 
    ? `-${Math.abs(mt.gridEnergyKwh).toFixed(3)} kWh (Exp)` 
    : `${mt.gridEnergyKwh.toFixed(3)} kWh (Imp)`;

  // 2. Refresh scope charts
  if (scopeChart) {
    scopeChart.data.labels = tr.time;
    scopeChart.data.datasets[0].data = tr.vdc;
    scopeChart.data.datasets[1].data = tr.soc;
    scopeChart.data.datasets[2].data = tr.ppv;
    scopeChart.data.datasets[3].data = tr.pbat;
    scopeChart.data.datasets[4].data = tr.pload;
    scopeChart.data.datasets[5].data = tr.pgrid;
    scopeChart.update();
  }
}

// Initialize Scope Chart.js Configuration (Multi-Axis)
function initScopeChart() {
  const canvas = document.getElementById('chart-simulink-scope');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  scopeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'DC Link Voltage Vdc (V)',
          data: [],
          borderColor: '#ef4444',
          borderWidth: 2.5,
          yAxisID: 'yVoltage',
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 6
        },
        {
          label: 'Battery SOC (%)',
          data: [],
          borderColor: '#10b981',
          borderWidth: 2.5,
          yAxisID: 'yPercent',
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 6
        },
        {
          label: 'PV Power Ppv (kW)',
          data: [],
          borderColor: '#f59e0b',
          borderWidth: 1.8,
          borderDash: [2, 2],
          yAxisID: 'yPower',
          tension: 0.1,
          pointRadius: 0
        },
        {
          label: 'Battery Power Pbatt (kW)',
          data: [],
          borderColor: '#a855f7',
          borderWidth: 1.8,
          yAxisID: 'yPower',
          tension: 0.1,
          pointRadius: 0
        },
        {
          label: 'AC Load Power (kW)',
          data: [],
          borderColor: '#34d399',
          borderWidth: 1.8,
          yAxisID: 'yPower',
          tension: 0.1,
          pointRadius: 0
        },
        {
          label: 'Grid Active Power (kW)',
          data: [],
          borderColor: '#3b82f6',
          borderWidth: 1.8,
          yAxisID: 'yPower',
          tension: 0.1,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#1d1d1f',
            boxWidth: 12,
            font: { size: 9.5, family: 'SF Pro Text, system-ui' }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          titleColor: '#1d1d1f',
          bodyColor: '#515154',
          borderColor: 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          titleFont: { family: 'SF Pro Text, system-ui', weight: 'bold' },
          bodyFont: { family: 'SF Pro Text, system-ui' }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Simulation Time (Seconds)', color: '#6e6e73', font: { size: 10, family: 'SF Pro Text, system-ui' } },
          ticks: { color: '#6e6e73', font: { size: 9, family: 'SF Pro Text, system-ui' } },
          grid: { color: 'rgba(0, 0, 0, 0.04)' }
        },
        yVoltage: {
          type: 'linear',
          position: 'left',
          min: 650,
          max: 900,
          title: { display: true, text: 'DC Voltage (V)', color: '#ef4444', font: { size: 10, weight: 'bold', family: 'SF Pro Text, system-ui' } },
          ticks: { color: '#ef4444', font: { size: 9 } },
          grid: { color: 'rgba(0, 0, 0, 0.04)' }
        },
        yPercent: {
          type: 'linear',
          position: 'left',
          min: 0,
          max: 100,
          title: { display: true, text: 'SOC (%)', color: '#10b981', font: { size: 10, weight: 'bold', family: 'SF Pro Text, system-ui' } },
          ticks: { color: '#10b981', font: { size: 9 } },
          grid: { drawOnChartArea: false }
        },
        yPower: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Power (kW)', color: '#1d1d1f', font: { size: 10, weight: 'bold', family: 'SF Pro Text, system-ui' } },
          ticks: { color: '#6e6e73', font: { size: 9 } },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}
