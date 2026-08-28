<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { createNativeNote, loadNativeNotes, nativeNotes, removeNativeNote, updateNativeNote, type NativeNote } from '$lib/nativeNotes';
	import { nativeWidgetPorts } from '$lib/suite/widgets';

	const port = nativeWidgetPorts.vNotes;
	let selectedId = '';
	let draftTitle = '';
	let draftText = '';
	let saveTimer: ReturnType<typeof setTimeout> | undefined;

	$: selected = $nativeNotes.find((note) => note.id === selectedId) ?? $nativeNotes[0] ?? null;
	$: if (selected && selected.id !== selectedId) select(selected);

	onMount(() => {
		loadNativeNotes();
	});

	onDestroy(flush);

	function select(note: NativeNote) {
		flush();
		selectedId = note.id;
		draftTitle = note.title;
		draftText = note.text;
	}

	function queueSave() {
		if (!selected) return;
		clearTimeout(saveTimer);
		saveTimer = setTimeout(flush, 300);
	}

	function flush() {
		clearTimeout(saveTimer);
		saveTimer = undefined;
		if (selected && (selected.title !== draftTitle || selected.text !== draftText)) {
			updateNativeNote(selected.id, { title: draftTitle, text: draftText });
		}
	}

	function addNote() {
		flush();
		select(createNativeNote());
	}

	function deleteSelected() {
		if (!selected) return;
		const next = $nativeNotes.find((note) => note.id !== selected.id) ?? null;
		removeNativeNote(selected.id);
		selectedId = next?.id ?? '';
		draftTitle = next?.title ?? '';
		draftText = next?.text ?? '';
	}
</script>

<main data-testid="native-notes-port" class="min-h-screen bg-terminal-bg px-4 py-5 text-terminal-text sm:px-6">
	<header class="mx-auto flex max-w-6xl items-center justify-between gap-4 border-b border-terminal-border pb-4">
		<div>
			<p class="text-3xs font-semibold uppercase tracking-[0.2em] text-terminal-cyan">Native widget port · {port.story}</p>
			<h1 class="mt-1 text-xl font-semibold">{port.title}</h1>
		</div>
		<a data-action-id="ui.src.lib.components.nativenotesport.a.h37a451a7f2" href="/hub" class="rounded border border-terminal-border px-3 py-2 text-xs text-terminal-text-secondary hover:border-terminal-cyan hover:text-terminal-cyan">Open preserved Hub</a>
	</header>

	<section class="mx-auto grid max-w-6xl gap-4 py-5 lg:grid-cols-[14rem_minmax(0,1fr)_18rem]">
		<aside class="rounded border border-terminal-border bg-terminal-bg-panel p-3">
			<div class="mb-3 flex items-center justify-between"><h2 class="text-xs font-semibold uppercase tracking-[0.16em]">Scratchpads</h2><button data-action-id="ui.src.lib.components.nativenotesport.button.h8b1565906d" class="rounded border border-terminal-border px-2 py-1 text-2xs text-terminal-cyan hover:border-terminal-cyan" onclick={addNote}>New</button></div>
			<div class="space-y-1">
				{#each $nativeNotes as note (note.id)}
					<button data-action-id="ui.src.lib.components.nativenotesport.button.h0c31e72bde" class="w-full truncate rounded px-2 py-2 text-left text-xs {note.id === selected?.id ? 'bg-terminal-cyan/10 text-terminal-cyan' : 'text-terminal-text-secondary hover:bg-terminal-bg-hover'}" onclick={() => select(note)}>{note.title || 'Untitled scratchpad'}</button>
				{:else}
					<p class="p-2 text-xs leading-5 text-terminal-text-muted">No scratchpads yet. Create one to keep local trade plans, levels, and reminders.</p>
				{/each}
			</div>
		</aside>

		<section class="min-h-[32rem] rounded border border-terminal-border bg-terminal-bg-panel p-4">
			{#if selected}
				<div class="mb-3 flex gap-2"><input data-action-id="ui.src.lib.components.nativenotesport.input.h121ab64719" aria-label="Scratchpad title" class="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-terminal-text-muted" bind:value={draftTitle} oninput={queueSave} placeholder="Untitled scratchpad" /><button data-action-id="ui.src.lib.components.nativenotesport.button.hab175ba56f" class="rounded border border-terminal-border px-2 py-1 text-2xs text-terminal-red hover:border-terminal-red" onclick={deleteSelected}>Delete</button></div>
				<textarea data-action-id="ui.src.lib.components.nativenotesport.textarea.h88f846452e" aria-label="Scratchpad text" class="min-h-[26rem] w-full resize-y bg-transparent font-mono text-sm leading-6 outline-none placeholder:text-terminal-text-muted" bind:value={draftText} oninput={queueSave} placeholder="Write your trade plan, levels, and reminders…"></textarea>
			{:else}
				<div class="flex min-h-[26rem] items-center justify-center text-center text-sm text-terminal-text-muted"><div><p>No scratchpad selected.</p><button data-action-id="ui.src.lib.components.nativenotesport.button.h56aba97084" class="mt-3 rounded border border-terminal-border px-3 py-2 text-xs text-terminal-cyan hover:border-terminal-cyan" onclick={addNote}>Create scratchpad</button></div></div>
			{/if}
		</section>

		<aside class="rounded border border-terminal-border bg-terminal-bg-panel p-4 text-sm leading-6 text-terminal-text-secondary">
			<h2 class="text-xs font-semibold uppercase tracking-[0.16em] text-terminal-text">Port contract</h2>
			<p class="mt-3">{port.provenance}. Existing legacy Hub scratchpad text is imported once only when no native record exists.</p>
			<p class="mt-3 text-terminal-yellow">This surface has no market feed, signer, account, order, telemetry, or execution path. Legacy Hub remains available as rollback.</p>
		</aside>
	</section>
</main>
