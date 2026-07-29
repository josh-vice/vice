import { get, writable, type Writable } from 'svelte/store';

export type NativeNote = {
	id: string;
	title: string;
	text: string;
	updatedAt: number;
};

const STORAGE_KEY = 'vice.native-notes.v1';
const LEGACY_STORAGE_KEY = 'viceHub.v1';
const MAX_NOTES = 50;
const MAX_TEXT_LENGTH = 50_000;

export const nativeNotes: Writable<NativeNote[]> = writable([]);

let loaded = false;

function canUseStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

function validNote(value: unknown): value is NativeNote {
	if (!value || typeof value !== 'object') return false;
	const note = value as Partial<NativeNote>;
	return typeof note.id === 'string' && typeof note.title === 'string' && typeof note.text === 'string' &&
		typeof note.updatedAt === 'number' && Number.isFinite(note.updatedAt);
}

function save(notes: NativeNote[]): void {
	if (!canUseStorage()) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.slice(0, MAX_NOTES)));
	} catch {
		// Notes are a local convenience. Storage failure must not affect public data or trading.
	}
}

function legacyNotes(): NativeNote[] {
	if (!canUseStorage()) return [];
	try {
		const source = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? 'null') as {
			layouts?: Record<string, { grid?: Array<{ id?: unknown; type?: unknown; settings?: { text?: unknown } }> }>;
		} | null;
		if (!source?.layouts || typeof source.layouts !== 'object') return [];
		const migrated: NativeNote[] = [];
		for (const [layoutName, layout] of Object.entries(source.layouts)) {
			for (const [index, widget] of (layout.grid ?? []).entries()) {
				if (widget?.type !== 'vNotes' || typeof widget.settings?.text !== 'string') continue;
				const text = widget.settings.text.slice(0, MAX_TEXT_LENGTH);
				migrated.push({
					id: typeof widget.id === 'string' ? `legacy:${widget.id}` : `legacy:${layoutName}:${index}`,
					title: layoutName === 'Default' ? 'Scratchpad' : `${layoutName} scratchpad`,
					text,
					updatedAt: 0
				});
				if (migrated.length >= MAX_NOTES) return migrated;
			}
		}
		return migrated;
	} catch {
		return [];
	}
}

/** Loads native notes once and imports legacy Hub scratchpads only when no native record exists. */
export function loadNativeNotes(): NativeNote[] {
	if (loaded) return get(nativeNotes);
	loaded = true;
	if (!canUseStorage()) return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw !== null) {
			const parsed = JSON.parse(raw);
			const notes = Array.isArray(parsed) ? parsed.filter(validNote).slice(0, MAX_NOTES) : [];
			nativeNotes.set(notes);
			return notes;
		}
	} catch {
		// A corrupt native record is contained here. Its presence must not trigger
		// a surprise re-import or any alteration of the legacy Hub record.
		nativeNotes.set([]);
		return [];
	}
	const migrated = legacyNotes();
	nativeNotes.set(migrated);
	if (migrated.length > 0) save(migrated);
	return migrated;
}

export function createNativeNote(): NativeNote {
	loadNativeNotes();
	const note: NativeNote = { id: crypto.randomUUID(), title: 'Untitled scratchpad', text: '', updatedAt: Date.now() };
	nativeNotes.update((current) => {
		const next = [note, ...current].slice(0, MAX_NOTES);
		save(next);
		return next;
	});
	return note;
}

export function updateNativeNote(id: string, patch: Pick<NativeNote, 'title' | 'text'>): void {
	loadNativeNotes();
	nativeNotes.update((current) => {
		const next = current.map((note) => note.id === id
			? { ...note, title: patch.title.slice(0, 120), text: patch.text.slice(0, MAX_TEXT_LENGTH), updatedAt: Date.now() }
			: note);
		save(next);
		return next;
	});
}

export function removeNativeNote(id: string): void {
	loadNativeNotes();
	nativeNotes.update((current) => {
		const next = current.filter((note) => note.id !== id);
		save(next);
		return next;
	});
}
