"use client";

export interface LocationDef {
  id: string;
  name: string;
  atmosphere: string;
  description: string;
  colors: string;
  scenePreset: "observatory" | "garden" | "rooftop";
}

export const LOCATIONS: LocationDef[] = [
  {
    id: "cloud_observatory",
    name: "Cloud Observatory",
    atmosphere: "High above a sleeping city",
    description: "Stars visible through glass floor. Distant lights below. The silence between words feels significant.",
    colors: "linear-gradient(145deg, #151a42, #dc8b6b)",
    scenePreset: "observatory",
  },
  {
    id: "submerged_garden",
    name: "Submerged Garden",
    atmosphere: "Blue quiet, glass, moving leaves",
    description: "Water filters the light. Fish trace slow circles. You speak and the sound bends through liquid air.",
    colors: "linear-gradient(145deg, #082f49, #3a9d88)",
    scenePreset: "garden",
  },
  {
    id: "neon_rooftop",
    name: "Neon Rooftop",
    atmosphere: "Rain, signs, and distant music",
    description: "The city hums below. Steam rises from vents. A flickering sign casts pink across both your faces.",
    colors: "linear-gradient(145deg, #30154f, #d34d7b)",
    scenePreset: "rooftop",
  },
];

export function getLocation(id: string): LocationDef | undefined {
  return LOCATIONS.find((l) => l.id === id);
}
