import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabung class Tailwind dengan benar (dedupe konflik) — standar shadcn/ui. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
