export interface MaterialProperties {
    name: string;
    densityMin: number; // kg/m^3
    densityMax: number; // kg/m^3
    angleRepose: number; // degrees
    angleSurcharge: number; // degrees
    abrasiveness: "Non-abrasive" | "Abrasive" | "Very Abrasive" | "Sharp";
    description?: string;
}

export const MaterialDatabase: MaterialProperties[] = [
    {
        name: "Anthracite Coal",
        densityMin: 800,
        densityMax: 960,
        angleRepose: 27,
        angleSurcharge: 10,
        abrasiveness: "Non-abrasive",
        description: "Sized, washed, clean."
    },
    {
        name: "Bituminous Coal",
        densityMin: 640,
        densityMax: 880,
        angleRepose: 35,
        angleSurcharge: 20,
        abrasiveness: "Non-abrasive",
        description: "Run of mine."
    },
    {
        name: "Lignite Coal",
        densityMin: 640,
        densityMax: 800,
        angleRepose: 38,
        angleSurcharge: 25,
        abrasiveness: "Non-abrasive",
        description: "Air dried."
    },
    {
        name: "Limestone (Crushed)",
        densityMin: 1360,
        densityMax: 1600,
        angleRepose: 38,
        angleSurcharge: 20,
        abrasiveness: "Abrasive"
    },
    {
        name: "Sand (Dry)",
        densityMin: 1440,
        densityMax: 1760,
        angleRepose: 35,
        angleSurcharge: 25,
        abrasiveness: "Very Abrasive"
    },
    {
        name: "NPK Fertilizer",
        densityMin: 880,
        densityMax: 1120, // varies widely
        angleRepose: 32,
        angleSurcharge: 15, // typical flowable
        abrasiveness: "Abrasive" // Corrosive also
    },
    {
        name: "Urea Prills",
        densityMin: 700,
        densityMax: 780,
        angleRepose: 28,
        angleSurcharge: 15,
        abrasiveness: "Non-abrasive"
    },
    {
        name: "Wood Chips",
        densityMin: 220,
        densityMax: 480,
        angleRepose: 45,
        angleSurcharge: 25, // Interlocking
        abrasiveness: "Non-abrasive"
    },
    {
        name: "Iron Ore (Crushed)",
        densityMin: 2000,
        densityMax: 2800,
        angleRepose: 35,
        angleSurcharge: 25,
        abrasiveness: "Very Abrasive"
    }
];

export function getMaterialByName(name: string): MaterialProperties | undefined {
    return MaterialDatabase.find((m) => m.name === name);
}
