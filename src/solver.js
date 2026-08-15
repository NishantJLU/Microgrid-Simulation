// SimuGrid Discrete Math Solver (1ms fixed-step Euler ODE integration)

export function runSimulinkSolver(p) {
  const steps = p.Tsim / p.dt; // 10s / 0.001s = 10,000 steps
  
  // State variables initialization
  let Vdc = p.Vdc0;
  let soc = p.SOC0;

  // Trackers
  const traceTime = [];
  const traceVdc = [];
  const traceSoc = [];
  const tracePpv = [];
  const tracePbat = [];
  const tracePload = [];
  const tracePgrid = [];

  let vdcMin = Infinity;
  let vdcMax = -Infinity;
  let totalGridEnergyWh = 0;

  // Discrete solver iteration loop
  for (let k = 0; k < steps; k++) {
    const t = k * p.dt;

    // Downsample trace data to prevent UI canvas drawing overhead (every 50 steps = 200 data points)
    // We record the state at the start of the step to ensure exact initial conditions at t=0.0s
    if (k % 50 === 0) {
      const G = t >= p.solarStepTime ? p.solarStepAfter : p.solarStepBefore;
      const Ppv = p.Ppv_rated * Math.max(0, Math.min(1, G / 1000));
      const Pload = t >= p.loadStepTime ? p.loadStepAfter : p.loadStepBefore;
      const Vdc_Error = p.Vdc_ref - Vdc;
      const Pcmd = p.Kbat * Vdc_Error;
      const Pbatt = Math.max(-p.Pbat_max, Math.min(p.Pbat_max, Pcmd));
      const Pgrid = Pload - Ppv - Pbatt;

      traceTime.push(t.toFixed(2));
      traceVdc.push(parseFloat(Vdc.toFixed(2)));
      traceSoc.push(parseFloat((soc * 100).toFixed(2)));
      tracePpv.push(parseFloat((Ppv / 1000).toFixed(2)));
      tracePbat.push(parseFloat((Pbatt / 1000).toFixed(2)));
      tracePload.push(parseFloat((Pload / 1000).toFixed(2)));
      tracePgrid.push(parseFloat((Pgrid / 1000).toFixed(2)));
    }

    // 1. Irradiance Step function
    const G = t >= p.solarStepTime ? p.solarStepAfter : p.solarStepBefore;

    // 2. PV Array MATLAB Function model
    const Ppv = p.Ppv_rated * Math.max(0, Math.min(1, G / 1000));

    // 3. Load demand Step function
    const Pload = t >= p.loadStepTime ? p.loadStepAfter : p.loadStepBefore;

    // 4. Inverter active tracking
    const Pinv = Pload * p.Kinv;

    // 5. Battery Controller & Limit (one-sample delay on feedback voltage to break algebraic loop)
    const Vdc_Error = p.Vdc_ref - Vdc; // feedback is last step's Vdc
    const Pcmd = p.Kbat * Vdc_Error;
    const Pbatt = Math.max(-p.Pbat_max, Math.min(p.Pbat_max, Pcmd)); // Positive = discharge, Negative = charge

    // 6. BESS SOC integration
    soc = soc - Pbatt * p.dt / (p.Ebat_Wh * 3600);
    soc = Math.max(0.10, Math.min(0.95, soc));

    // 7. DC Link dynamical capacitor state equation (dV/dt)
    // Avoid division by zero by clamping v at 100V
    const dV_dt = (Ppv + Pbatt - Pinv) / (p.Cdc * Math.max(Vdc, 100));
    Vdc = Vdc + p.dt * dV_dt;
    Vdc = Math.max(500, Math.min(1000, Vdc));

    // 8. Grid active power balance
    const Pgrid = Pload - Ppv - Pbatt;
    
    // Accumulate grid active power (Wh)
    totalGridEnergyWh += Pgrid * p.dt / 3600;

    // Record min/max transients
    if (Vdc < vdcMin) vdcMin = Vdc;
    if (Vdc > vdcMax) vdcMax = Vdc;
  }

  // Final downsampled trace point
  const tFinal = p.Tsim;
  traceTime.push(tFinal.toFixed(2));
  traceVdc.push(parseFloat(Vdc.toFixed(2)));
  traceSoc.push(parseFloat((soc * 100).toFixed(2)));
  const finalG = tFinal >= p.solarStepTime ? p.solarStepAfter : p.solarStepBefore;
  const finalPload = tFinal >= p.loadStepTime ? p.loadStepAfter : p.loadStepBefore;
  tracePpv.push(parseFloat((p.Ppv_rated * Math.max(0, Math.min(1, finalG / 1000)) / 1000).toFixed(2)));
  const finalPcmd = p.Kbat * (p.Vdc_ref - Vdc);
  const finalPbat = Math.max(-p.Pbat_max, Math.min(p.Pbat_max, finalPcmd));
  tracePbat.push(parseFloat((finalPbat / 1000).toFixed(2)));
  tracePload.push(parseFloat((finalPload / 1000).toFixed(2)));
  tracePgrid.push(parseFloat(((finalPload - (p.Ppv_rated * Math.max(0, Math.min(1, finalG / 1000))) - finalPbat) / 1000).toFixed(2)));

  return {
    traces: {
      time: traceTime,
      vdc: traceVdc,
      soc: traceSoc,
      ppv: tracePpv,
      pbat: tracePbat,
      pload: tracePload,
      pgrid: tracePgrid
    },
    metrics: {
      vdcMin,
      vdcMax,
      socFinal: soc,
      gridEnergyKwh: totalGridEnergyWh / 1000
    }
  };
}
