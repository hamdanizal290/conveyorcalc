export interface ConveyorInput {
    // --- 1. Design Targets ---
    driveConfig: "Head" | "Tail" | "Dual Head" | "Dual Tail";
    conveyorDirection: "Incline" | "Decline" | "Horizontal" | "Reversible";
    designCapacity: number; // tph
    beltSpeed: number; // m/s
    wrapAngle: number; // deg

    // --- 2. Material ---
    materialName: string;
    materialDensity: number; // kg/m3 (Internal calc uses kg/m3)
    lumpSize: number; // mm
    surchargeAngle: number; // deg
    reposeAngle: number; // deg
    materialCondition: string;

    // --- 3. Conveyor Geometry ---
    horizontalLength: number; // m
    liftHeight: number; // m
    carrierPitch: number; // m
    returnPitch: number; // m
    troughAngle: number; // deg
    numberOfPlies?: number; // Optional manual override

    // --- 4. Belt & Components ---
    beltWidth: number; // mm
    beltMass: number; // kg/m
    idlerMass: number; // kg/m (Carrier)
    returnIdlerMass?: number; // kg/m (Return - if diff)
    beltSag: number; // % (e.g. 2.0)
    frictionIdlers: number; // f (0.02)
    driveEfficiency: number; // 0.9 etc.

    // --- 5. Advanced Resistances (Accessory Power) ---
    // Hopper
    hopperHeight?: number; // m
    hopperBottomWidth?: number; // m
    hopperBottomLength?: number; // m

    // Skirtboard
    skirtLength?: number; // m (l_k)
    skirtWidth?: number; // m (b_s) - usually 2/3 belt width

    // Tripper / Scraper / Plough
    tripperCount?: number;
    scraperCount?: number;
    ploughCount?: number;
}

export interface TensionPoint {
    location: string; // "Head", "Tail", "Snub", "Bend1", etc.
    coord?: number; // m from tail
    t_tight: number; // N
    t_slack: number; // N
    tension: number; // N (General)
}

export interface CemaPowerResult {
    // Resistances (Forces in N)
    f_idlers: number; // Kx + Ky... Main resistance
    f_lift: number; // H * g * Wm
    f_hopper: number; // Pullout
    f_skirt: number; // Friction on skirt
    f_bending: number; // Belt bending
    f_cleaners: number; // Scrapers etc.
    f_accel: number; // Acceleration force

    // Effective Tension
    te: number; // Sum of all resistances

    // Power (kW)
    p_horizontal: number;
    p_lift: number;
    p_accessories: number;
    p_total_shaft: number; // At drive pulley
    p_motor_min: number; // Shaft / efficiency
    p_motor_installed: number; // With safety factor
}

export interface CemaTensionResult {
    t1: number; // Tight side max
    t2: number; // Slack side
    t3: number;
    t4: number;
    t_tail: number;
    t_max: number; // Global max

    min_tension_sag: number; // To prevent excessive sag
    min_tension_drive: number; // To prevent slip
}

export interface PulleyCalculation {
    diameter: number; // mm
    faceWidth: number; // mm
    shaftTorque: number; // Nm
    resultantLoad: number; // N
}

export interface ConveyorResult {
    capacityVol: number; // m3/h
    capacityMass: number; // tph
    capacityStatus: "OK" | "NOT OK";

    beltSpeed: number; // m/s
    beltSpeedStatus: "OK" | "High" | "Low";

    powerAnalysis: CemaPowerResult;
    tensionAnalysis: CemaTensionResult;
    pulleyAnalysis: PulleyCalculation;

    outputLog: string[]; // Debug log for showing formulas used
}
