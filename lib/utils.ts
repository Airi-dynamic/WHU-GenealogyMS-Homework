import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatYear(year: number | null | undefined): string {
  if (!year) return "—";
  return `${year}年`;
}

export function calcAge(birthYear: number | null | undefined, deathYear?: number | null): string {
  if (!birthYear) return "—";
  const endYear = deathYear ?? new Date().getFullYear();
  return `${endYear - birthYear}岁`;
}
