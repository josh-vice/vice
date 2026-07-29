<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { selectedMarket, activeSubaccount, demoFixturesEnabled } from '$lib/stores';
	import { ExternalLink, X, Minimize2, Hash, AlertTriangle, ChevronDown, Rss, Heart, Repeat2, MessageCircle, UserCheck, UserPlus, Settings2 } from 'lucide-svelte';
	import type { TrollboxXAccount } from '$lib/trollboxFixtures';

	// ─── Types ───────────────────────────────────────────────────────────────────

	type Language = 'EN' | 'ZH' | 'RU';

	// ─── News Feed Types ──────────────────────────────────────────────────────────

	type XAccount = TrollboxXAccount;

	interface XPost {
		id: number;
		accountId: string;
		text: string;
		ts: number;
		likes: number;
		retweets: number;
		replies: number;
		tags: string[];
		breaking?: boolean;
	}

	type MessageType = 'chat' | 'liquidation' | 'system' | 'position';

	interface Message {
		id: number;
		type: MessageType;
		lang: Language;
		user: string;
		handle: string | null;   // custom nickname
		text: string;
		ts: number;
		badge?: PositionBadge;
	}

	interface PositionBadge {
		symbol: string;
		side: 'Long' | 'Short';
		size: number;
		entry: number;
		pnl: number;
		pnlPct: number;
	}

	// ─── Props ───────────────────────────────────────────────────────────────────

	export let docked = true;        // false = floating pop-out window mode
	export let onPopOut: (() => void) | null = null;

	// ─── State ───────────────────────────────────────────────────────────────────

	type TrolltabType = Language | 'NEWS';
	let activeTab: TrolltabType = 'EN';

	// ─── News Feed State ──────────────────────────────────────────────────────────

	let newsPostIdCounter = 0;
	let newsShowSettings = false;
	let newsFeedEl: HTMLDivElement;
	let newsAutoScroll = true;
	let newsPosts: XPost[] = [];
	let newsInterval: ReturnType<typeof setInterval>;
	let accounts: XAccount[] = [];
	let postTemplates: Record<string, { text: string; tags: string[]; breaking?: boolean }[]> = {};
	let seedMessages: Omit<Message, 'id' | 'ts'>[] = [];
	let botChatter: Omit<Message, 'id' | 'ts'>[] = [];
	let liqTemplates: ((sym: string, side: string, usd: string, px: string) => string)[] = [];
	let liqInterval: ReturnType<typeof setInterval>;
	let chatInterval: ReturnType<typeof setInterval>;

	function getAccount(id: string) {
		return accounts.find(a => a.id === id)!;
	}

	function pushNewsPost(accountId: string, templateIdx?: number) {
		const acc = getAccount(accountId);
		if (!acc?.followed) return;
		const templates = postTemplates[accountId] ?? [];
		if (!templates.length) return;
		const t = templates[templateIdx ?? Math.floor(Math.random() * templates.length)];
		newsPosts = [...newsPosts.slice(-99), {
			id: ++newsPostIdCounter,
			accountId,
			text: t.text,
			ts: Date.now(),
			likes: Math.floor(Math.random() * 4800) + 200,
			retweets: Math.floor(Math.random() * 1200) + 50,
			replies: Math.floor(Math.random() * 320) + 10,
			tags: t.tags,
			breaking: t.breaking,
		}];
		if (newsAutoScroll) scrollNewsToTop();
	}

	function scrollNewsToTop() {
		tick().then(() => { if (newsFeedEl) newsFeedEl.scrollTop = 0; });
	}

	function onNewsScroll() {
		if (!newsFeedEl) return;
		newsAutoScroll = newsFeedEl.scrollTop < 60;
	}

	function toggleFollow(id: string) {
		accounts = accounts.map(a => a.id === id ? { ...a, followed: !a.followed } : a);
	}

	function formatNewsTime(ts: number) {
		const diff = Math.floor((Date.now() - ts) / 1000);
		if (diff < 60) return `${diff}s`;
		if (diff < 3600) return `${Math.floor(diff / 60)}m`;
		return `${Math.floor(diff / 3600)}h`;
	}

	function formatCount(n: number) {
		return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;
	}

	$: followedAccounts = accounts.filter(a => a.followed);
	$: visibleNewsPosts = newsPosts.filter(p => accounts.find(a => a.id === p.accountId)?.followed).slice().reverse();
	let input = '';
	let messages: Message[] = [];
	let messageContainer: HTMLDivElement;
	let inputEl: HTMLInputElement;
	let autoScroll = true;
	let idCounter = 0;
	let showCommandHint = false;
	let customHandle = '';
	let editingHandle = false;
	let handleInput = '';

	// Moderation: banned words (competitor names, slurs)
	const BANNED_PATTERNS = [
		/\bbinance\b/i, /\bbybit\b/i, /\bokx\b/i, /\bdydx\b/i,
		/\bkucoin\b/i, /\bkraken\b/i, /\bcoinbase\b/i,
		/\bn[i1][g9][g9][e3]r\b/i, /\bf[a@]gg?[o0]t\b/i
	];


	// ─── Mount ───────────────────────────────────────────────────────────────────

	onMount(() => {
		// Production must not even run fixture timers or seed simulated community,
		// news, liquidation, or position messages. The unavailable branch below is
		// a truthful surface, not merely a visual concealment.
		if (!demoFixturesEnabled) return;

		let cancelled = false;
		void import('$lib/trollboxFixtures').then((fixtures) => {
			if (cancelled) return;
			accounts = [...fixtures.X_ACCOUNTS];
			postTemplates = fixtures.POST_TEMPLATES;
			seedMessages = fixtures.SEED_MESSAGES.map((message) => ({ ...message }));
			botChatter = fixtures.BOT_CHATTER.map((message) => ({ ...message, type: 'chat' as const }));
			liqTemplates = fixtures.LIQ_TEMPLATES;

			// Seed initial messages with staggered timestamps
			const now = Date.now();
			seedMessages.forEach((m, i) => {
				messages = [...messages, { ...m, id: ++idCounter, ts: now - (seedMessages.length - i) * 47000 }];
			});

			// Seed initial news posts (one per followed account, staggered)
			const followedIds = accounts.filter(a => a.followed).map(a => a.id);
			followedIds.forEach((id, i) => {
				const templates = postTemplates[id] ?? [];
			if (!templates.length) return;
			const t = templates[i % templates.length];
			newsPosts = [...newsPosts, {
				id: ++newsPostIdCounter,
				accountId: id,
				text: t.text,
				ts: now - (followedIds.length - i) * 180000 + Math.random() * 60000,
				likes: Math.floor(Math.random() * 4800) + 200,
				retweets: Math.floor(Math.random() * 1200) + 50,
				replies: Math.floor(Math.random() * 320) + 10,
				tags: t.tags,
				breaking: t.breaking,
			}];
			});
			newsPosts = newsPosts.slice().sort((a, b) => b.ts - a.ts);

		// Streaming news — new post every 20–50s from a random followed account
			newsInterval = setInterval(() => {
			const followed = accounts.filter(a => a.followed);
			if (!followed.length) return;
			const acc = followed[Math.floor(Math.random() * followed.length)];
			pushNewsPost(acc.id);
			}, 20000 + Math.random() * 30000);

		// Liquidation feed
			liqInterval = setInterval(() => {
			const symbols = ['BTC-PERP', 'ETH-PERP', 'SOL-PERP', 'WIF-PERP', 'DOGE-PERP'];
			const sides = ['Long', 'Short'];
			const sym = symbols[Math.floor(Math.random() * symbols.length)];
			const side = sides[Math.floor(Math.random() * 2)];
			const usd = (50000 + Math.random() * 2000000).toLocaleString('en-US', { maximumFractionDigits: 0 });
			const px = (Math.random() * 100000).toFixed(2);
			pushMessage({
				type: 'liquidation',
				lang: 'EN',
				user: '__bot__',
				handle: null,
					text: liqTemplates[0](sym, side, usd, px),
			});
			}, 18000 + Math.random() * 20000);

		// Ambient chat
			chatInterval = setInterval(() => {
			const m = botChatter[Math.floor(Math.random() * botChatter.length)];
			pushMessage({ type: 'chat', ...m });
			}, 8000 + Math.random() * 12000);
		});

		return () => { cancelled = true; };
	});

	onDestroy(() => {
		clearInterval(liqInterval);
		clearInterval(chatInterval);
		clearInterval(newsInterval);
	});

	// ─── Helpers ─────────────────────────────────────────────────────────────────

	function pushMessage(m: Omit<Message, 'id' | 'ts'>) {
		messages = [...messages.slice(-199), { ...m, id: ++idCounter, ts: Date.now() }];
		if (autoScroll) scrollToBottom();
	}

	async function scrollToBottom() {
		await tick();
		if (messageContainer) messageContainer.scrollTop = messageContainer.scrollHeight;
	}

	function onScroll() {
		if (!messageContainer) return;
		const { scrollTop, scrollHeight, clientHeight } = messageContainer;
		autoScroll = scrollHeight - scrollTop - clientHeight < 40;
	}

	function isBanned(text: string) {
		return BANNED_PATTERNS.some(p => p.test(text));
	}

	function formatTime(ts: number) {
		return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
	}

	function getDisplayName(msg: Message) {
		return msg.handle ? `[${msg.handle}]` : msg.user;
	}

	// ─── Slash commands ───────────────────────────────────────────────────────────

	function handleInput_() {
		showCommandHint = input.startsWith('/');
	}

	function resolveSlashCommand(raw: string): Omit<Message, 'id' | 'ts'> | null {
		const parts = raw.trim().split(/\s+/);
		const cmd = parts[0].toLowerCase();
		const symbol = parts[1]?.toUpperCase() || $selectedMarket?.symbol || 'BTC-PERP';
		const handle = customHandle || null;
		const user = 'You';
		const lang: Language = activeTab;

		if (cmd === '/pnl' || cmd === '/position') {
			// Generate a mock verifiable position badge
			const side: 'Long' | 'Short' = Math.random() > 0.5 ? 'Long' : 'Short';
			const entry = ($selectedMarket?.lastPrice || 67000) * (1 + (Math.random() - 0.5) * 0.05);
			const pnlPct = (Math.random() - 0.4) * 12;
			const size = parseFloat((Math.random() * 3 + 0.1).toFixed(3));
			const pnl = entry * size * (pnlPct / 100);
			return {
				type: 'position', lang, user, handle,
				text: '',
				badge: { symbol, side, size, entry: parseFloat(entry.toFixed(2)), pnl: parseFloat(pnl.toFixed(2)), pnlPct: parseFloat(pnlPct.toFixed(2)) }
			};
		}
		return null;
	}

	function send() {
		const raw = input.trim();
		if (!raw) return;

		if (isBanned(raw)) {
			pushMessage({ type: 'system', lang: 'EN', user: 'System', handle: null, text: 'Message blocked by moderation filter.' });
			input = '';
			return;
		}

		if (raw.startsWith('/')) {
			const resolved = resolveSlashCommand(raw);
			if (resolved) {
				pushMessage(resolved);
				input = '';
				showCommandHint = false;
				return;
			}
		}

		pushMessage({
			type: 'chat',
			lang: activeTab,
			user: 'You',
			handle: customHandle || null,
			text: raw,
		});
		input = '';
		showCommandHint = false;
	}

	function saveHandle() {
		customHandle = handleInput.trim().toUpperCase().slice(0, 12);
		editingHandle = false;
	}

	$: visibleMessages = activeTab === 'NEWS' ? [] : messages.filter(m =>
		m.lang === (activeTab as Language) ||
		m.type === 'liquidation' ||
		m.type === 'system' ||
		m.type === 'position' ||
		activeTab === 'EN'
	);
</script>

{#if !demoFixturesEnabled}
	<div class="flex h-full items-center justify-center bg-terminal-bg-panel px-4 text-center text-2xs text-terminal-text-muted">
		Live community and news feeds are not connected. No simulated messages or market commentary are shown.
	</div>
{:else}
<!-- ─── Trollbox Shell (development fixture only) ─────────────────────────── -->
<div class="flex flex-col h-full bg-terminal-bg-panel text-xs select-none">

	<!-- Header -->
	<div class="flex items-center gap-1.5 px-2 h-8 border-b border-terminal-border flex-shrink-0 bg-terminal-bg-secondary">
		<Hash class="w-3 h-3 text-terminal-text-muted flex-shrink-0" />
		<span class="font-semibold text-terminal-text text-2xs tracking-wide uppercase">Trollbox</span>

		<!-- Language + News tabs -->
		<div class="flex items-center gap-0 ml-2">
			{#each (['EN','ZH','RU'] as Language[]) as lang}
				<button
					class="px-1.5 py-0.5 text-2xs rounded transition-colors {activeTab === lang ? 'text-terminal-cyan bg-terminal-cyan/10' : 'text-terminal-text-muted hover:text-terminal-text'}"
					onclick={() => { activeTab = lang; newsShowSettings = false; }}
				>{lang}</button>
			{/each}
			<button
				class="flex items-center gap-0.5 px-1.5 py-0.5 text-2xs rounded transition-colors ml-0.5
					{activeTab === 'NEWS' ? 'text-terminal-yellow bg-terminal-yellow/10' : 'text-terminal-text-muted hover:text-terminal-text'}"
				onclick={() => { activeTab = 'NEWS'; newsShowSettings = false; }}
			>
				<Rss class="w-2.5 h-2.5" />
				News
			</button>
		</div>

		<div class="ml-auto flex items-center gap-1">
			{#if activeTab === 'NEWS'}
				<!-- Manage subscriptions -->
				<button
					class="text-2xs px-1.5 py-0.5 rounded transition-colors flex items-center gap-0.5
						{newsShowSettings ? 'text-terminal-yellow bg-terminal-yellow/10' : 'text-terminal-text-muted hover:text-terminal-text hover:bg-terminal-bg-hover'}"
					onclick={() => (newsShowSettings = !newsShowSettings)}
					title="Manage subscriptions"
				>
					<Settings2 class="w-2.5 h-2.5" />
				</button>
			{:else}
				<!-- Custom handle button -->
				<button
					class="text-2xs text-terminal-text-muted hover:text-terminal-text px-1.5 py-0.5 rounded hover:bg-terminal-bg-hover transition-colors truncate max-w-[80px]"
					title="Set display nickname"
					onclick={() => { editingHandle = true; handleInput = customHandle; }}
				>
					{customHandle ? `[${customHandle}]` : 'set nick'}
				</button>
			{/if}

			<!-- Pop-out -->
			{#if onPopOut}
				<button
					class="text-terminal-text-muted hover:text-terminal-text p-0.5 rounded hover:bg-terminal-bg-hover transition-colors"
					title="Pop out"
					onclick={onPopOut}
				>
					<ExternalLink class="w-3 h-3" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Handle editor overlay -->
	{#if editingHandle}
		<div class="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
			<div class="bg-terminal-bg-secondary border border-terminal-border rounded p-4 w-56 shadow-xl">
				<p class="text-2xs text-terminal-text-muted mb-2 uppercase tracking-wide">Custom display name</p>
				<input
					class="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-xs text-terminal-text font-mono outline-none focus:border-terminal-cyan mb-3"
					maxlength="12"
					placeholder="e.g. WHALE"
					bind:value={handleInput}
					onkeydown={(e) => { if (e.key === 'Enter') saveHandle(); if (e.key === 'Escape') editingHandle = false; }}
				/>
				<div class="flex gap-2">
					<button class="flex-1 py-1 text-2xs rounded bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/30 hover:bg-terminal-cyan/30 transition-colors" onclick={saveHandle}>Save</button>
					<button class="flex-1 py-1 text-2xs rounded bg-terminal-bg-hover text-terminal-text-muted hover:text-terminal-text transition-colors" onclick={() => editingHandle = false}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- ─── News Feed Panel ──────────────────────────────────────────────────── -->
	{#if activeTab === 'NEWS'}
		{#if newsShowSettings}
			<!-- Subscription manager -->
			<div class="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2 py-2 space-y-1">
				{#each ['news', 'onchain', 'analyst', 'official'] as cat}
					{@const catAccounts = accounts.filter(a => a.category === cat)}
					<div class="mb-2">
						<div class="text-3xs text-terminal-text-muted uppercase tracking-widest px-1 mb-1 pt-1">
							{cat === 'onchain' ? 'On-Chain' : cat === 'analyst' ? 'Analysts' : cat === 'official' ? 'Official' : 'News'}
						</div>
						{#each catAccounts as acc}
							<div class="flex items-center gap-2 px-1.5 py-1.5 rounded hover:bg-terminal-bg-hover transition-colors">
								<!-- Avatar -->
								<div
									class="w-6 h-6 rounded-full flex items-center justify-center text-3xs font-bold text-terminal-bg flex-shrink-0"
									style="background: {acc.avatarColor}"
								>{acc.avatar}</div>
								<!-- Info -->
								<div class="flex-1 min-w-0">
									<div class="text-2xs font-semibold text-terminal-text leading-none">{acc.name}</div>
									<div class="text-3xs text-terminal-text-muted">{acc.handle}</div>
								</div>
								<!-- Follow toggle -->
								<button
									class="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-medium transition-colors border
										{acc.followed
											? 'border-terminal-cyan/40 text-terminal-cyan bg-terminal-cyan/8 hover:bg-terminal-red/10 hover:text-terminal-red hover:border-terminal-red/40'
											: 'border-terminal-border text-terminal-text-muted hover:text-terminal-text hover:border-terminal-border-light'}"
									onclick={() => toggleFollow(acc.id)}
								>
									{#if acc.followed}
										<UserCheck class="w-2.5 h-2.5" />
										Following
									{:else}
										<UserPlus class="w-2.5 h-2.5" />
										Follow
									{/if}
								</button>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		{:else}
			<!-- News post feed — newest at top -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="flex-1 min-h-0 overflow-y-auto scrollbar-thin"
				bind:this={newsFeedEl}
				onscroll={onNewsScroll}
			>
				{#if visibleNewsPosts.length === 0}
					<div class="flex flex-col items-center justify-center h-full gap-2 text-terminal-text-muted">
						<Rss class="w-6 h-6 opacity-30" />
						<span class="text-2xs">No posts yet. Follow accounts to see their posts.</span>
					</div>
				{:else}
					<div class="divide-y divide-terminal-border/40">
						{#each visibleNewsPosts as post (post.id)}
							{@const acc = getAccount(post.accountId)}
							<div class="px-2.5 py-2.5 hover:bg-terminal-bg-hover/40 transition-colors">
								{#if post.breaking}
									<div class="flex items-center gap-1 mb-1">
										<span class="text-3xs font-bold uppercase tracking-wider text-terminal-red px-1 py-0.5 rounded bg-terminal-red/12 border border-terminal-red/30">Breaking</span>
									</div>
								{/if}
								<!-- Account row -->
								<div class="flex items-center gap-1.5 mb-1">
									<div
										class="w-5 h-5 rounded-full flex items-center justify-center text-3xs font-bold text-terminal-bg flex-shrink-0"
										style="background: {acc?.avatarColor ?? '#666'}"
									>{acc?.avatar ?? '?'}</div>
									<span class="text-2xs font-semibold text-terminal-text leading-none">{acc?.name}</span>
									<span class="text-3xs text-terminal-text-muted">{acc?.handle}</span>
									<span class="ml-auto text-3xs text-terminal-text-muted flex-shrink-0">{formatNewsTime(post.ts)}</span>
								</div>
								<!-- Post text -->
								<p class="text-2xs text-terminal-text leading-relaxed mb-1.5">{post.text}</p>
								<!-- Tags -->
								{#if post.tags.length}
									<div class="flex flex-wrap gap-1 mb-1.5">
										{#each post.tags as tag}
											<span class="text-3xs text-terminal-cyan font-mono">#{tag}</span>
										{/each}
									</div>
								{/if}
								<!-- Engagement row -->
								<div class="flex items-center gap-3 text-3xs text-terminal-text-muted">
									<span class="flex items-center gap-0.5">
										<MessageCircle class="w-2.5 h-2.5" />{formatCount(post.replies)}
									</span>
									<span class="flex items-center gap-0.5">
										<Repeat2 class="w-2.5 h-2.5" />{formatCount(post.retweets)}
									</span>
									<span class="flex items-center gap-0.5">
										<Heart class="w-2.5 h-2.5" />{formatCount(post.likes)}
									</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{/if}

	<!-- ─── Chat Message Feed (shown when NOT on News tab) ───────────────────── -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="flex-1 overflow-y-auto min-h-0 px-2 py-1.5 space-y-0.5 font-mono scrollbar-thin {activeTab === 'NEWS' ? 'hidden' : ''}"
		bind:this={messageContainer}
		onscroll={onScroll}
	>
		{#each visibleMessages as msg (msg.id)}
			{#if msg.type === 'liquidation'}
				<!-- Liquidation event row -->
				<div class="flex items-start gap-1.5 py-0.5 px-1.5 rounded bg-terminal-red/8 border-l-2 border-terminal-red/60 my-1">
					<AlertTriangle class="w-2.5 h-2.5 text-terminal-red flex-shrink-0 mt-0.5" />
					<span class="text-2xs text-terminal-red font-semibold leading-relaxed">{msg.text}</span>
					<span class="ml-auto text-3xs text-terminal-text-muted flex-shrink-0">{formatTime(msg.ts)}</span>
				</div>

			{:else if msg.type === 'system'}
				<div class="text-2xs text-terminal-text-muted text-center py-0.5 italic">— {msg.text} —</div>

			{:else if msg.type === 'position' && msg.badge}
				<!-- Verified position badge -->
				<div class="my-1.5">
					<div class="flex items-center gap-1 mb-0.5">
						<span class="text-2xs {msg.user === 'You' ? 'text-terminal-cyan' : 'text-terminal-text-secondary'}">{getDisplayName(msg)}</span>
						<span class="text-3xs text-terminal-text-muted">{formatTime(msg.ts)}</span>
					</div>
					<div class="inline-flex flex-col rounded border px-2.5 py-1.5 gap-0.5
						{msg.badge.pnl >= 0 ? 'border-terminal-green/40 bg-terminal-green/6' : 'border-terminal-red/40 bg-terminal-red/6'}">
						<div class="flex items-center gap-2">
							<span class="text-2xs font-semibold text-terminal-text">{msg.badge.symbol}</span>
							<span class="text-2xs px-1 rounded font-bold
								{msg.badge.side === 'Long' ? 'bg-terminal-green/20 text-terminal-green' : 'bg-terminal-red/20 text-terminal-red'}">
								{msg.badge.side}
							</span>
							<span class="text-2xs text-terminal-text-muted">{msg.badge.size} contracts</span>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-3xs text-terminal-text-muted">Entry <span class="text-terminal-text">${msg.badge.entry.toLocaleString()}</span></span>
							<span class="text-2xs font-bold tabular-nums
								{msg.badge.pnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">
								{msg.badge.pnl >= 0 ? '+' : ''}{msg.badge.pnlPct.toFixed(2)}% ({msg.badge.pnl >= 0 ? '+' : ''}${msg.badge.pnl.toLocaleString('en-US', { maximumFractionDigits: 0 })})
							</span>
						</div>
						<span class="text-3xs text-terminal-text-muted/60 mt-0.5">verified · read-only</span>
					</div>
				</div>

			{:else}
				<!-- Regular chat message -->
				<div class="flex items-start gap-1 leading-relaxed group">
					<span class="flex-shrink-0 text-3xs text-terminal-text-muted mt-0.5 w-8">{formatTime(msg.ts)}</span>
					<span class="flex-shrink-0 font-semibold text-2xs
						{msg.user === 'You' ? 'text-terminal-cyan' :
						 msg.handle ? 'text-terminal-yellow' : 'text-terminal-text-secondary'}
					">{getDisplayName(msg)}:</span>
					<span class="text-2xs text-terminal-text break-words min-w-0">{msg.text}</span>
				</div>
			{/if}
		{/each}
	</div>

	<!-- Slash command hint -->
	{#if showCommandHint}
		<div class="mx-2 mb-1 p-1.5 bg-terminal-bg-secondary border border-terminal-border/60 rounded text-2xs text-terminal-text-muted space-y-0.5">
			<div class="text-terminal-cyan font-mono">/pnl [symbol]</div>
			<div class="text-terminal-text-muted">Share verified PnL badge for a position</div>
			<div class="text-terminal-cyan font-mono mt-1">/position [symbol]</div>
			<div class="text-terminal-text-muted">Share position size + entry price</div>
		</div>
	{/if}

	<!-- Input bar (hidden on News tab) -->
	<div class="flex items-center gap-1.5 px-2 py-1.5 border-t border-terminal-border flex-shrink-0 bg-terminal-bg-secondary {activeTab === 'NEWS' ? 'hidden' : ''}">
		<input
			bind:this={inputEl}
			bind:value={input}
			placeholder="Chat or type / for commands…"
			maxlength="280"
			class="flex-1 bg-transparent outline-none text-2xs text-terminal-text placeholder:text-terminal-text-muted font-mono"
			oninput={handleInput_}
			onkeydown={(e) => { if (e.key === 'Enter') send(); if (e.key === 'Escape') { showCommandHint = false; input = ''; } }}
		/>
		{#if input.length > 0}
			<span class="text-3xs text-terminal-text-muted tabular-nums">{input.length}/280</span>
		{/if}
		<button
			class="text-2xs px-2 py-0.5 rounded bg-terminal-green/20 text-terminal-green border border-terminal-green/30 hover:bg-terminal-green/30 transition-colors disabled:opacity-40"
			disabled={input.trim().length === 0}
			onclick={send}
		>Send</button>
	</div>
</div>
{/if}
