import { writable, type Writable } from 'svelte/store';

export type BookSigFigs = 2 | 3 | 4 | 5;
export type BookDepth = 12 | 24 | 50;
const STORAGE_KEY = 'vice.book-sig-figs.v1';
const DEPTH_STORAGE_KEY = 'vice.book-depth.v1';
const valid = new Set<BookSigFigs>([2, 3, 4, 5]);
const validDepth = new Set<BookDepth>([12, 24, 50]);
export const bookSigFigs: Writable<BookSigFigs> = writable(5);
export const bookDepth: Writable<BookDepth> = writable(12);
let loaded = false;

export function loadBookSigFigs(): BookSigFigs {
	if (loaded || typeof localStorage === 'undefined') return 5;
	loaded = true;
	const value = Number(localStorage.getItem(STORAGE_KEY));
	const result = valid.has(value as BookSigFigs) ? value as BookSigFigs : 5;
	bookSigFigs.set(result);
	return result;
}

export function loadBookDepth(): BookDepth {
	if (typeof localStorage === 'undefined') return 12;
	const value = Number(localStorage.getItem(DEPTH_STORAGE_KEY));
	const result = validDepth.has(value as BookDepth) ? value as BookDepth : 12;
	bookDepth.set(result);
	return result;
}

export function setBookSigFigs(value: number): BookSigFigs {
	const result = valid.has(value as BookSigFigs) ? value as BookSigFigs : 5;
	bookSigFigs.set(result);
	try { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, String(result)); } catch { /* local preference only */ }
	return result;
}

/** Changes only how many already-received, validated levels the DOM draws. */
export function setBookDepth(value: number): BookDepth {
	const result = validDepth.has(value as BookDepth) ? value as BookDepth : 12;
	bookDepth.set(result);
	try { if (typeof localStorage !== 'undefined') localStorage.setItem(DEPTH_STORAGE_KEY, String(result)); } catch { /* local preference only */ }
	return result;
}
