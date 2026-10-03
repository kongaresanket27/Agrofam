import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const COMMODITIES = [
  "Wheat",
  "Rice",
  "Paddy(Dhan)(Common)",
  "Soyabean",
  "Soybean",
  "Cotton",
  "Maize",
  "Onion",
  "Potato",
  "Tomato",
  "Sugarcane",
  "Turmeric",
  "Groundnut",
  "Mustard",
  "Bajra(Pearl Millet/Cumbu)",
  "Jowar(Sorghum)",
] as const;

export const EQUIPMENT_CATEGORIES = [
  "Tractor",
  "Implement",
  "Harvester",
  "Sprayer",
  "Irrigation",
  "Tool",
  "Other",
] as const;

export function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}
