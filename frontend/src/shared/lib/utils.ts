import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function delay(ms: number = 0) {
	return new Promise((resolve) => setTimeout(() => resolve(true), ms))
}
export function todayUtcStr(): string {
	const tz = import.meta.env.VITE_TZ || 'Europe/Moscow'
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: tz,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(new Date())
}

export function parseDateStr(dateStr: string | undefined): Date | undefined {
	if (!dateStr) return undefined

	const [y, m, d] = dateStr.split('-').map(Number)
	const date = new Date(y, m - 1, d)
	return Number.isNaN(date.getTime()) ? undefined : date
}

export function toUtcDateStr(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function formatBookingDate(value: string): string {
	const date = new Date(`${value}T00:00:00Z`)
	if (Number.isNaN(date.getTime())) return value

	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(date)
}
