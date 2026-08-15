function build_microgrid_r2026a()
% BUILD_MICROGRID_R2026A
% Creates a runnable Simulink-level microgrid model for MATLAB R2026a.
%
% The model intentionally uses native Simulink blocks for the system-level
% energy-flow model, so it does NOT depend on the removed Specialized Power
% Systems (SPS) library/powergui.
%
% Architecture:
% PV Array -> DC/DC -> DC Link -> Inverter -> Transformer -> Grid
%                           ^
%                           |
%                         BESS
%                           |
%                         Load
%
% This is an averaged/control-oriented microgrid model, not an EMT switching
% model. It is suitable for demonstrating PV generation, battery charge/
% discharge, DC-link regulation, grid power balance, and load variation.
%
% Run:
%   build_microgrid_r2026a
%   sim('microgrid_r2026a')
%
% Required: Simulink. No Specialized Power Systems / powergui block is used.

mdl = 'microgrid_r2026a';

if bdIsLoaded(mdl)
    close_system(mdl,0);
end
if exist([mdl '.slx'],'file')
    delete([mdl '.slx']);
end

% -----------------------------
% Parameters
% -----------------------------
Ppv_rated = 60e3;       % W
Vdc_ref   = 800;        % V
Cdc       = 0.02;       % F
Pbat_max  = 30e3;       % W, positive = discharge
Ebat_Wh  = 120e3;       % Wh
SOC0      = 0.60;
Vdc0      = 800;        % V
Pload0    = 45e3;       % W
Pgrid0    = 0;          % W
Kbat      = 250;        % W/V
Kinv      = 1.0;        % averaged inverter power tracking gain
Tsim      = 10;         % s

assignin('base','Ppv_rated',Ppv_rated);
assignin('base','Vdc_ref',Vdc_ref);
assignin('base','Cdc',Cdc);
assignin('base','Pbat_max',Pbat_max);
assignin('base','Ebat_Wh',Ebat_Wh);
assignin('base','SOC0',SOC0);
assignin('base','Vdc0',Vdc0);
assignin('base','Pload0',Pload0);
assignin('base','Pgrid0',Pgrid0);
assignin('base','Kbat',Kbat);
assignin('base','Kinv',Kinv);
assignin('base','Tsim',Tsim);

% -----------------------------
% Create model
% -----------------------------
new_system(mdl);
open_system(mdl);
set_param(mdl,'StopTime','Tsim');
set_param(mdl,'Solver','FixedStepDiscrete');
set_param(mdl,'FixedStep','1e-3');

% Colors
cPV = [0.93 0.93 0.75];
cB  = [0.78 0.88 0.98];
cG  = [0.88 0.88 0.88];
cM  = [0.85 0.95 0.85];

% Main blocks
add_block('simulink/Sources/Step',[mdl '/Irradiance'], ...
    'Position',[30 115 90 145], ...
    'Time','5','Before','1000','After','700', ...
    'BackgroundColor',mat2str(cPV));

add_block('simulink/User-Defined Functions/MATLAB Function',[mdl '/PV_Array'], ...
    'Position',[130 85 270 175]);
set_param([mdl '/PV_Array'],'MaskDisplay','disp(''PV Array\n60 kW'')');
pvCode = [
"function Ppv = fcn(G)" newline ...
"% Averaged PV power model" newline ...
"Ppv_rated = 60000;" newline ...
"Ppv = Ppv_rated*max(0,min(1,G/1000));" newline ...
"end"];
set_mf_script(mdl, 'PV_Array', pvCode);

add_block('simulink/Math Operations/Gain',[mdl '/DC_DC_Converter'], ...
    'Position',[315 100 405 160],'Gain','1', ...
    'BackgroundColor',mat2str(cG));

% Battery controller
add_block('simulink/Math Operations/Sum',[mdl '/Vdc_Error'], ...
    'Position',[445 50 475 85],'Inputs','+-');
add_block('simulink/Math Operations/Gain',[mdl '/Battery_Controller'], ...
    'Position',[505 45 590 90],'Gain','Kbat');
add_block('simulink/Discontinuities/Saturation',[mdl '/Battery_Power_Limit'], ...
    'Position',[620 45 700 90], ...
    'UpperLimit','Pbat_max','LowerLimit','-Pbat_max', ...
    'BackgroundColor',mat2str(cB));

add_block('simulink/User-Defined Functions/MATLAB Function',[mdl '/BESS'], ...
    'Position',[730 25 870 115]);
bessCode = [
"function [Pbatt,SOC] = fcn(Pcmd)" newline ...
"% Positive Pbatt = battery discharge; negative = charge" newline ...
"persistent soc" newline ...
"if isempty(soc), soc = 0.60; end" newline ...
"dt = 1e-3;" newline ...
"Ebat_Wh = 120000;" newline ...
"soc = soc - Pcmd*dt/(Ebat_Wh*3600);" newline ...
"soc = min(0.95,max(0.10,soc));" newline ...
"Pbatt = Pcmd;" newline ...
"SOC = soc;" newline ...
"end"];
set_mf_script(mdl, 'BESS', bessCode);

% Inverter power tracking
add_block('simulink/Math Operations/Gain',[mdl '/Inverter'], ...
    'Position',[520 190 610 245],'Gain','Kinv', ...
    'BackgroundColor',mat2str(cG));

% Load profile
add_block('simulink/Sources/Step',[mdl '/Load_Step'], ...
    'Position',[30 330 90 360], ...
    'Time','6','Before','45000','After','55000');
add_block('simulink/Sources/Constant',[mdl '/Base_Load'], ...
    'Position',[120 325 180 365],'Value','0');
add_block('simulink/Math Operations/Sum',[mdl '/Load'], ...
    'Position',[220 325 250 365],'Inputs','++','BackgroundColor',mat2str(cG));

% Grid power balance
add_block('simulink/Math Operations/Sum',[mdl '/Grid_Power_Balance'], ...
    'Position',[650 205 680 255],'Inputs','+--');
% Inputs: load + inverter losses - PV - battery
add_block('simulink/Math Operations/Gain',[mdl '/Transformer'], ...
    'Position',[720 195 810 255],'Gain','0.98', ...
    'BackgroundColor',mat2str(cG));

% DC link dynamic model:
% dV/dt = (Ppv + Pbatt - Pinv)/(Cdc*Vdc)
add_block('simulink/User-Defined Functions/MATLAB Function',[mdl '/DC_Link'], ...
    'Position',[520 300 680 390]);
dcCode = [
"function Vdc = fcn(Ppv,Pbatt,Pinv)" newline ...
"persistent v" newline ...
"if isempty(v), v = 800; end" newline ...
"dt = 1e-3;" newline ...
"C = 0.02;" newline ...
"v = v + dt*(Ppv + Pbatt - Pinv)/(C*max(v,100));" newline ...
"v = min(1000,max(500,v));" newline ...
"Vdc = v;" newline ...
"end"];
set_mf_script(mdl, 'DC_Link', dcCode);

% Measurements
add_block('simulink/Signal Routing/Mux',[mdl '/Measurements'], ...
    'Position',[850 180 875 330],'Inputs','6');
add_block('simulink/Sinks/Scope',[mdl '/Scope'], ...
    'Position',[920 175 1080 330]);

% Numeric displays
add_block('simulink/Sinks/Display',[mdl '/Vdc_Display'], ...
    'Position',[720 300 800 335]);
add_block('simulink/Sinks/Display',[mdl '/SOC_Display'], ...
    'Position',[720 350 800 385]);

% Frequency and AC-side labels/signals (system-level)
add_block('simulink/Sources/Constant',[mdl '/Grid_Frequency'], ...
    'Position',[720 410 790 440],'Value','50');
add_block('simulink/Sources/Constant',[mdl '/Grid_Vll'], ...
    'Position',[810 410 880 440],'Value','415');

% Annotations
add_block('simulink/Signal Routing/Goto',[mdl '/PV_Goto'], ...
    'Position',[285 105 305 135],'GotoTag','Ppv');

% -----------------------------
% Connections
% -----------------------------
add_line(mdl,'Irradiance/1','PV_Array/1');
add_line(mdl,'PV_Array/1','DC_DC_Converter/1');
add_line(mdl,'PV_Array/1','PV_Goto/1');

% Vdc reference and feedback
% A one-sample Unit Delay is intentionally inserted in the measured-Vdc
% feedback path. Without it, DC_Link -> Vdc_Error -> Battery Controller
% -> BESS -> DC_Link forms an algebraic loop containing stateful MATLAB
% Function blocks, which Simulink R2026a does not permit.
add_block('simulink/Sources/Constant',[mdl '/Vdc_Reference'], ...
    'Position',[360 35 420 65],'Value','Vdc_ref');

add_block('simulink/Discrete/Unit Delay',[mdl '/Vdc_Feedback_Delay'], ...
    'Position',[435 105 515 140], ...
    'InitialCondition','Vdc0', ...
    'SampleTime','1e-3');

add_line(mdl,'Vdc_Reference/1','Vdc_Error/1');
add_line(mdl,'DC_Link/1','Vdc_Feedback_Delay/1');
add_line(mdl,'Vdc_Feedback_Delay/1','Vdc_Error/2');

% Battery controller and BESS
add_line(mdl,'Vdc_Error/1','Battery_Controller/1');
add_line(mdl,'Battery_Controller/1','Battery_Power_Limit/1');
add_line(mdl,'Battery_Power_Limit/1','BESS/1');
add_line(mdl,'BESS/2','SOC_Display/1');

% Averaged inverter transfers the AC load demand from the DC link.
add_line(mdl,'Load/1','Inverter/1');
add_line(mdl,'Inverter/1','DC_Link/3');

% DC-link power balance: PV + battery - inverter.
add_line(mdl,'DC_DC_Converter/1','DC_Link/1');
add_line(mdl,'BESS/1','DC_Link/2');

% Load
add_line(mdl,'Load_Step/1','Load/1');
add_line(mdl,'Base_Load/1','Load/2');

% Grid power balance = load - PV - battery
add_line(mdl,'Load/1','Grid_Power_Balance/1');
add_line(mdl,'PV_Array/1','Grid_Power_Balance/2');
add_line(mdl,'BESS/1','Grid_Power_Balance/3');
add_line(mdl,'Grid_Power_Balance/1','Transformer/1');

% Measurement mux
add_line(mdl,'DC_Link/1','Measurements/1');
add_line(mdl,'BESS/1','Measurements/2');
add_line(mdl,'BESS/2','Measurements/3');
add_line(mdl,'Grid_Power_Balance/1','Measurements/4');
add_line(mdl,'Load/1','Measurements/5');
add_line(mdl,'Grid_Frequency/1','Measurements/6');
add_line(mdl,'Measurements/1','Scope/1');

add_line(mdl,'DC_Link/1','Vdc_Display/1');

% Visual labels
annotation = Simulink.Annotation(mdl,'PV ARRAY  →  DC/DC  →  DC LINK  →  INVERTER  →  TRANSFORMER  →  GRID');
annotation.Position = [120 5 760 30];
annotation.FontSize = 14;
annotation.FontWeight = 'bold';

annotation2 = Simulink.Annotation(mdl,'BESS provides DC-link support | Load changes at t = 6 s | Irradiance changes at t = 5 s');
annotation2.Position = [180 450 720 475];
annotation2.FontSize = 10;

% Add signal labels
set_param([mdl '/DC_DC_Converter'],'Name','DC-DC Converter');
set_param([mdl '/DC_Link'],'Name','DC Link');
set_param([mdl '/BESS'],'Name','Battery BESS');
set_param([mdl '/Inverter'],'Name','Inverter');
set_param([mdl '/Transformer'],'Name','Transformer');
set_param([mdl '/Load'],'Name','Load');
set_param([mdl '/Grid_Power_Balance'],'Name','Grid');

save_system(mdl,[mdl '.slx']);
fprintf('\nCreated: %s.slx\n',mdl);
fprintf('Simulation time: %g s\n',Tsim);
fprintf('Algebraic-loop protection: Vdc_Feedback_Delay = 1 sample (1 ms)\n');
fprintf('Open with: open_system(''%s'')\n',mdl);
fprintf('Run with: sim(''%s'')\n\n',mdl);
end

function set_mf_script(mdl, blockName, code)
% Configure a MATLAB Function block through the Stateflow API.
% set_param(...,'Script',...) is not a valid Simulink parameter.
blockPath = [mdl '/' blockName];
bd = get_param(mdl, 'Object');
chart = find(bd, '-isa', 'Stateflow.EMChart', 'Path', blockPath);
if isempty(chart)
    error('Could not find MATLAB Function block: %s', blockPath);
end
chart.Script = char(code);
chart.ChartUpdate = 'DISCRETE';
chart.SampleTime = '0.001';
end
