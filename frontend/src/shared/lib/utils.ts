import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function delay(ms: number = 0) {
  return new Promise((resolve) => setTimeout(() => resolve(true), ms));
}
export function todayUtcStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseDateStr(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;

  const d = new Date(`${dateStr}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function toUtcDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}
