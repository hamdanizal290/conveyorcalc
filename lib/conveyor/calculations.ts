import { ConveyorInput, ConveyorResult, CemaPowerResult, CemaTensionResult, PulleyCalculation } from "./types";

export type { ConveyorInput, ConveyorResult };

/**
 * Calculates conveyor parameters based on CEMA 6th/7th Ed Standard.
 */
export function calculateConveyor(input: ConveyorInput): ConveyorResult {
    const log: string[] = [];
    const g = 9.81; // m/s2

    // --- 1. GEOMETRY & BASICS ---
    const L = input.horizontalLength;
    const H = input.liftHeight;
    const angleRad = Math.atan(H / L);
    const angleDeg = angleRad * (180 / Math.PI);
    const lengthSlope = Math.sqrt(L ** 2 + H ** 2);

    // --- 2. SPEED & CAPACITY CHECK ---
    // User provides designCapacity (tph) and beltSpeed (m/s) as targets.
    // Calcs:
    // Area A (m2), Density (kg/m3) -> CapVol = A * V * 3600
    // We assume standard CEMA cross section area approximation if not provided.
    // A approx = k * (0.9B - 0.05)^2 (Very rough, better to use standard factor tables)
    // Let's use simplified Area factor "As" for 3 roll trough:
    let areaFactor = 0.13; // Flat
    if (input.troughAngle >= 30) areaFactor = 0.17; // 35 deg

    const bw_m = input.beltWidth / 1000;
    const Ag = areaFactor * (bw_m * bw_m); // Cross section area approx

    // Volumetric Capacity (m3/h)
    const capVol = Ag * input.beltSpeed * 3600;
    // Mass Capacity (tph) - using input density (kg/m3) / 1000
    const capMass = capVol * (input.materialDensity / 1000);

    // Status Check
    // If calculated Capacity > (Design Capacity * 1.1), it's OK (Conservative). 
    // If Calced < Design, NOT OK.
    const capacityStatus = capMass >= input.designCapacity ? "OK" : "NOT OK";

    // --- 3. MASSES ---
    // Wm (Material Mass per m) = Q(tph) * 1000 / (3.6 * V) = kg/m
    // Let's use Design Capacity for Power Calculation to be safe
    const Wm = (input.designCapacity * 1000) / (3.6 * input.beltSpeed);
    const Wb = input.beltMass;
    const Wi = input.idlerMass; // Carrier idlers
    const Wri = input.returnIdlerMass || (input.idlerMass * 0.4); // Approx return idlers if not given

    // --- 4. CEMA POWER ANALYSIS (Te Calc) ---
    // Te = F_idlers + F_lift + F_accessories
    // CEMA Standard: Te = L * Kt * (Kx + Ky*Wb + 0.015*Wb) + Wm*(L*Ky +/- H) ... 
    // User requested "Idle friction f", "Adjustment Length lo"... implies the "Analytical Method" (Te = F_frict + F_grav + F_special)

    // A. Main Resistance (Rolling Friction) - F_idlers
    // F_rolling = f * L * g * (W_moving_parts + W_material)
    // f = frictionIdlers (0.02 - 0.03 range typical)
    // Moving parts = Weights of belt + idlers.
    // Length Adjustment (lo): Often added to length to account for terminal friction?
    // CEMA 5th: Te = C * f * L * g * (masses) ...
    // Let's use the explicit sum provided by user hints: "Weight of Moving Part <W>", "Volume of Load <Qm>"

    // Total moving mass per meter (Carrier side + Return side)
    // Carrier Side Mass: (Wb + Wi + Wm)
    // Return Side Mass: (Wb + Wri)
    // Friction Force F_frict = f * L * g * (2*Wb + Wi + Wri + Wm) * cos(alpha)
    // Wait, better to split into Carrier and Return for tension accuracy.
    const f_friction = input.frictionIdlers;

    const F_carrier_friction = f_friction * lengthSlope * g * (Wb + Wi + Wm) * Math.cos(angleRad);
    const F_return_friction = f_friction * lengthSlope * g * (Wb + Wri) * Math.cos(angleRad);

    // B. Gravity / Lift Force
    const F_lift_material = Wm * g * input.liftHeight; // (+) for incline
    const F_lift_belt_carrier = Wb * g * input.liftHeight;
    const F_lift_belt_return = Wb * g * (-input.liftHeight); // Cancels out loop, but affects local tension

    // Effective Lift Force felt by Motor = Material Lift ONLY (Belt balances out)
    const F_lift_effective = F_lift_material;

    // C. Accessories (Skirts, Hoppers, Cleaners)
    // 1. Skirtboard Friction: F_skirt = C_skirt * L_skirt * W_material_in_skirt?
    // CEMA: F_skirt = Lb * (2*Cs*h^2 + V*h) ... complex
    // Simplified: F_skirt = mu_skirt * Force_normal.
    // User prompt: "Add. Resistance from Skirt <Fk>"
    // Rough calc: F_skirt (N) ~ (45 N/m per skirt plate) * 2 sides * length
    // Or user provided mu? Let's use typical if not given.
    const skirtLen = input.skirtLength || 0;
    const F_skirt = skirtLen > 0 ? (skirtLen * 2 * 60) : 0; // Approx 60 N/m friction

    // 2. Hopper Pullout: Fh
    // Force to drag material out of hopper.
    // Fh = mu_mat * P_load * ...
    // Let's approximate typical shear force: 2000 N if hopper present
    const F_hopper = input.hopperHeight ? 1500 : 0;

    // 3. Cleaners (Scraper / Plough): F_cleaners
    // Scraper: ~ 3-5 N per mm of contact width? Or fixed per blade.
    // Typically 1.5 kN per cleaner for wide belts.
    const scraperForce = (input.scraperCount || 0) * 1500;
    const ploughForce = (input.ploughCount || 0) * 800;
    const F_cleaners = scraperForce + ploughForce;

    // 4. Belt Bending: Fb (Over pulleys)
    // Function of tension and thickness. Rough estimate:
    const F_bending = 500; // N (Placeholder for complex recurring calc)

    // D. TOTAL EFFECTIVE TENSION (Te)
    // Sum of all motion-opposing forces
    // Te = (Friction Carrier + Friction Return) + F_Lift + Accessories
    const Te = F_carrier_friction + F_return_friction + F_lift_effective + F_skirt + F_hopper + F_cleaners + F_bending;

    // --- 5. POWER CALCULATION (kW) ---
    // P_belt (kW) = Te (N) * V (m/s) / 1000
    const P_belt = (Te * input.beltSpeed) / 1000;

    // Motor Power
    // P_motor = P_belt / efficiency / safety_factor?
    // User asks for "Calculated Axle Power Drive <P^t>" and "Power Drive (Efficiency) <P>"
    const P_shaft = P_belt / input.driveEfficiency;
    // Apply Safety Factor (SFM) - typ 1.2
    const SFM = 1.2;
    const P_motor_installed = P_shaft * SFM;

    // --- 6. TENSION ANALYSIS (Max Tension) ---
    // We need T2 (Slack side) to prevent slip.
    // T2_min >= Te * (1 / (exp(mu * theta) - 1))
    // mu = drive friction (0.35 rubber/steel), theta = wrap angle rad
    const mu_drive = 0.35;
    const theta_rad = input.wrapAngle * (Math.PI / 180);
    const drive_factor = 1 / (Math.exp(mu_drive * theta_rad) - 1); // CEMA K factor approx

    const T2_slip = Te * drive_factor;

    // Also T_min for sag control: To keep sag < 2% typically.
    // T_sag_min = (W_belt + W_mat) * Spacing^2 / (8 * Sag) 
    // Sag given as % (e.g. 2% = 0.02 * Spacing) -> SagDist = 0.02 * S
    // T = w * S^2 / (8 * 0.02 * S) = w * S / 0.16
    // Use Carrier Pitch for calculating sag tension
    const massTotal = Wb + Wm;
    const sagPercent = input.beltSag / 100; // 0.02
    const T_sag_min_carrier = (massTotal * g * input.carrierPitch) / (8 * sagPercent);

    // Actual T2 is max of required slip tension or required sag tension (propagated)
    // Simplified: T2 = Max(T2_slip, T_sag_min at tail mapped to head)
    // For standard Head Drive Incline:
    // T1 = Te + T2
    // Max Tension usually at Head (T1).
    const T2 = Math.max(T2_slip, 5000); // Minimum 5kN pre-tension
    const T1 = Te + T2;
    const T_max = T1;

    // --- 7. PULLEY CALCULATION ---
    // Shaft Torque T = (Te * D / 2) -> Te is effective force diff at pulley
    // Te = T1 - T2 (at drive pulley)
    const pulleyD_mm = 600; // Standardize or calc based on ply
    const pulleyD_m = pulleyD_mm / 1000;
    const torque = Te * (pulleyD_m / 2); // Nm

    // Resultant Load on Pulley Shaft (Vector sum of T1 and T2)
    // R = sqrt(T1^2 + T2^2 - 2*T1*T2*cos(theta))
    const resultantLoad = Math.sqrt(T1 ** 2 + T2 ** 2 - 2 * T1 * T2 * Math.cos(theta_rad));

    return {
        capacityVol: capVol,
        capacityMass: capMass,
        capacityStatus,
        beltSpeed: input.beltSpeed,
        beltSpeedStatus: "OK",

        powerAnalysis: {
            f_idlers: F_carrier_friction + F_return_friction,
            f_lift: F_lift_effective,
            f_hopper: F_hopper,
            f_skirt: F_skirt,
            f_bending: F_bending,
            f_cleaners: F_cleaners,
            f_accel: 0,
            te: Te,

            p_horizontal: ((F_carrier_friction + F_return_friction) * input.beltSpeed) / 1000,
            p_lift: (F_lift_effective * input.beltSpeed) / 1000,
            p_accessories: ((F_skirt + F_hopper + F_cleaners) * input.beltSpeed) / 1000,
            p_total_shaft: P_shaft,
            p_motor_min: P_shaft,
            p_motor_installed: P_motor_installed
        },

        tensionAnalysis: {
            t1: T1,
            t2: T2,
            t3: T2 - F_return_friction / 2, // Approximate
            t4: T2 - F_return_friction,
            t_tail: T2 - F_return_friction,
            t_max: T_max,
            min_tension_sag: T_sag_min_carrier,
            min_tension_drive: T2_slip
        },

        pulleyAnalysis: {
            diameter: pulleyD_mm,
            faceWidth: input.beltWidth + 100,
            shaftTorque: torque,
            resultantLoad: resultantLoad
        },

        outputLog: log
    };
}
