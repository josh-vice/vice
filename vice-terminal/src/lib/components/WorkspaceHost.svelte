<script lang="ts">
	import { onMount } from 'svelte';
	import { mount, unmount } from 'svelte';
	import type { DockviewApi } from 'dockview';
	import Chart from './Chart.svelte';
	import MarketWatchlist from './MarketWatchlist.svelte';
	import MarketDataWorkspacePanel from './MarketDataWorkspacePanel.svelte';
	import OrderTicket from './OrderTicket.svelte';
	import BottomPanel from './BottomPanel.svelte';
	import MarketSnapshotPanel from './MarketSnapshotPanel.svelte';
	import PitChat from './PitChat.svelte';
	import { get } from 'svelte/store';
	import { loadWorkspaceLayout, removeWorkspaceLayout, saveWorkspaceLayout } from '$lib/workspaceLayout';
	import { workspaceLocked, workspacePanels, workspacePreset, WORKSPACE_TOPOLOGIES } from '$lib/workspacePreset';
	import { chartTimeframe, selectedMarket } from '$lib/stores';
	import { startRuntimeHealthTelemetry } from '$lib/native/performance';
	import { loadWorkspaceLinkContexts, setWorkspaceLinkContext, WORKSPACE_LINK_GROUPS } from '$lib/workspaceLinks';
	import 'dockview/dist/styles/dockview.css';

	type PanelName = 'watchlist' | 'chart' | 'market-data' | 'ticket' | 'activity' | 'chat' | 'market-snapshot';
	let host: HTMLDivElement;

	const componentFor: Record<PanelName, any> = {
		watchlist: MarketWatchlist,
		chart: Chart,
		'market-data': MarketDataWorkspacePanel,
		ticket: OrderTicket,
		activity: BottomPanel,
		chat: PitChat,
		'market-snapshot': MarketSnapshotPanel
	};

	onMount(() => {
		let disposed = false;
		let saveTimer: ReturnType<typeof setTimeout> | undefined;
		let layoutSubscription: (() => void) | undefined;
		let panelAddedSubscription: (() => void) | undefined;
		let panelSubscription: (() => void) | undefined;
		let presetSubscription: (() => void) | undefined;
		let lockSubscription: (() => void) | undefined;
		let api: DockviewApi | undefined;
		let subscriptionsReady = false;
		const stopRuntimeHealthTelemetry = startRuntimeHealthTelemetry();
		loadWorkspaceLinkContexts();

		const persist = () => {
			if (disposed || !api || $workspaceLocked) return;
			const preset = get(workspacePreset);
			const locked = get(workspaceLocked);
			const layout = api.toJSON() as Record<string, unknown>;
			if (Array.isArray(layout.floatingGroups) || Array.isArray(layout.popoutGroups)) return;
			if (saveTimer) clearTimeout(saveTimer);
			saveTimer = setTimeout(() => {
				if (!disposed && !get(workspaceLocked) && get(workspacePreset) === preset && locked === get(workspaceLocked)) {
					saveWorkspaceLayout(preset, layout);
				}
			}, 150);
		};

		const createDefaultLayout = () => {
			api.clear();
			const chart = api.addPanel({ id: 'chart', component: 'chart', title: 'Chart', minimumWidth: 300 });
			const activity = $workspacePanels.bottom && WORKSPACE_TOPOLOGIES[$workspacePreset].bottom
				? api.addPanel({ id: 'activity', component: 'activity', title: 'Account activity', position: { referencePanel: chart, direction: 'below' }, initialHeight: 250 })
				: undefined;
			const watchlist = $workspacePanels.watchlist && WORKSPACE_TOPOLOGIES[$workspacePreset].watchlist
				? api.addPanel({ id: 'watchlist', component: 'watchlist', title: 'Markets', position: { referencePanel: chart, direction: 'left' }, initialWidth: 280, minimumWidth: 200 })
				: undefined;
			const chat = $workspacePanels.chat && !$workspaceLocked
				? api.addPanel({ id: 'chat', component: 'chat', title: 'The Pit', position: { referencePanel: watchlist ?? chart, direction: 'below' }, initialHeight: 220, minimumHeight: 140 })
				: undefined;
			const ticket = $workspacePanels.ticket && WORKSPACE_TOPOLOGIES[$workspacePreset].ticket
				? api.addPanel({ id: 'ticket', component: 'ticket', title: 'Order ticket', position: { referencePanel: chart, direction: 'right' }, initialWidth: 320, minimumWidth: 280 })
				: undefined;
			if ($workspacePanels.marketData && WORKSPACE_TOPOLOGIES[$workspacePreset].marketData) {
				api.addPanel({ id: 'market-data', component: 'market-data', title: 'Depth & tape', position: { referencePanel: ticket ?? chart, direction: ticket ? 'left' : 'right' }, initialWidth: 270, minimumWidth: 200 });
			}
			// Dockview's insertion sequence preserves the newest edge panel but can
			// compress its prior sibling. Set all three sibling sizes after its first
			// measured frame, so a fresh default always leaves usable chart, book,
			// and ticket surfaces rather than a 100 px sliver.
			requestAnimationFrame(() => {
				if (disposed || !api) return;
				// Let Dockview solve the grid from panel minimums and the measured host.
				// Hard-coded width subtraction caused narrow charts and unstable splits.
				api.layout(host.clientWidth, host.clientHeight, true);
				const activityHeight = Math.min(320, Math.max(220, Math.round(host.clientHeight * 0.28)));
				activity?.api.setSize({ height: activityHeight });
				applyLock();
			});
		};

		const synchronizePanelVisibility = () => {
			if (!api) return;
			const chart = api.getPanel('chart') ?? api.addPanel({ id: 'chart', component: 'chart', title: 'Chart' });
			const topology = WORKSPACE_TOPOLOGIES[$workspacePreset];
			const desired = {
				watchlist: topology.watchlist && $workspacePanels.watchlist,
				chat: !$workspaceLocked && $workspacePanels.chat,
				marketData: topology.marketData && $workspacePanels.marketData,
				ticket: topology.ticket && $workspacePanels.ticket,
				activity: topology.bottom && $workspacePanels.bottom
			};

			for (const [key, visible] of Object.entries(desired)) {
				if (!visible) {
					const id = key === 'marketData' ? 'market-data' : key;
					const existing = api.getPanel(id);
					if (existing) api.removePanel(existing);
				}
			}

			let watchlist = api.getPanel('watchlist');
			if (desired.watchlist && !watchlist) {
				watchlist = api.addPanel({ id: 'watchlist', component: 'watchlist', title: 'Markets', position: { referencePanel: chart, direction: 'left' } });
			}

			let ticket = api.getPanel('ticket');
			let marketData = api.getPanel('market-data');
			if (desired.marketData && !marketData) {
				marketData = api.addPanel({
					id: 'market-data',
					component: 'market-data',
					title: 'Depth & tape',
					position: { referencePanel: ticket ?? chart, direction: ticket ? 'left' : 'right' }
				});
			}
			if (desired.ticket && !ticket) {
				ticket = api.addPanel({
					id: 'ticket',
					component: 'ticket',
					title: 'Order ticket',
					position: { referencePanel: marketData ?? chart, direction: 'right' }
				});
			}
			if (desired.chat && !api.getPanel('chat')) {
				api.addPanel({ id: 'chat', component: 'chat', title: 'The Pit', position: { referencePanel: watchlist ?? chart, direction: 'below' } });
			}
			if (desired.activity && !api.getPanel('activity')) {
				api.addPanel({ id: 'activity', component: 'activity', title: 'Account activity', position: { referencePanel: chart, direction: 'below' } });
			}
		};

		const restore = () => {
			const saved = loadWorkspaceLayout($workspacePreset);
			if (saved) {
				try { api.fromJSON(saved.layout as Parameters<DockviewApi['fromJSON']>[0]); synchronizePanelVisibility(); return; }
				catch { removeWorkspaceLayout($workspacePreset); }
			}
			createDefaultLayout();
		};

		const applyLock = () => {
			if (!api) return;
			for (const group of api.groups) {
				group.api.locked = $workspaceLocked;
				// Normal mode is chrome-free. Edit mode restores Dockview headers as
				// an intentional drag handle instead of a permanent title strip.
				group.header.hidden = $workspaceLocked;
			}
		};

		const resetWorkspace = () => {
			if (!api) return;
			if (saveTimer) clearTimeout(saveTimer);
			removeWorkspaceLayout($workspacePreset);
			createDefaultLayout();
			applyLock();
			persist();
		};

		void import('dockview').then(({ createDockview }) => {
			if (disposed) return;
			api = createDockview(host, {
				// Hidden panels do not retain a live render surface. Shared feeds and
				// execution state remain outside Dockview, so visibility cannot alter
				// market correctness or an active command lifecycle.
				defaultRenderer: 'onlyWhenVisible',
				// Presentation mutations must stay bounded to the terminal viewport and
				// never construct a second execution or market-data path.
				floatingGroupBounds: 'boundedWithinViewport',
				floatingGroupDragHandle: 'titlebar',
				popoutUrl: '/popout.html',
				keyboardNavigation: true,
				hideBorders: true,
				disableTabsOverflowList: true,
				getTabContextMenuItems: ({ panel, api: dockApi }) => {
					if ($workspaceLocked) return [];
					return [
						{
							label: 'Float panel',
							action: () => dockApi.addFloatingGroup(panel)
						},
					{
						label: 'Pop out panel',
						action: () => void dockApi.addPopoutGroup(panel, { popoutUrl: '/popout.html' })
					},
					{
						label: 'Open current market snapshot',
						disabled: !$selectedMarket,
						action: () => {
							const market = $selectedMarket;
							if (!market) return;
							dockApi.addPanel({
								id: `market-snapshot:${market.marketKey}:${crypto.randomUUID()}`,
								component: 'market-snapshot',
								title: `${market.symbol} snapshot`,
								params: { marketKey: market.marketKey },
								position: { referencePanel: panel, direction: 'right' },
								initialWidth: 260,
								inactive: true
							});
						}
					},
					...WORKSPACE_LINK_GROUPS.map((linkGroup) => ({
						label: `Open and set ${linkGroup} public link`,
						disabled: !$selectedMarket,
						action: () => {
							const market = $selectedMarket;
							if (!market) return;
							setWorkspaceLinkContext(linkGroup, { marketKey: market.marketKey, timeframe: $chartTimeframe });
							dockApi.addPanel({
								id: `market-snapshot:${linkGroup}:${market.marketKey}:${crypto.randomUUID()}`,
								component: 'market-snapshot',
								title: `${market.symbol} · ${linkGroup}`,
								params: { marketKey: market.marketKey, linkGroup, timeframe: $chartTimeframe },
								position: { referencePanel: panel, direction: 'right' },
								initialWidth: 260,
								inactive: true
							});
						}
					}))
					];
					},
				createComponent: (options: { name: string }) => {
					const component = componentFor[options.name as PanelName];
					if (!component) throw new Error(`Unknown Vice workspace panel: ${options.name}`);
					const element = document.createElement('div');
					element.className = 'h-full w-full min-h-0 min-w-0';
					element.dataset.workspacePanel = options.name;
					let instance: ReturnType<typeof mount> | undefined;
					const focusId: Partial<Record<PanelName, string>> = {
						chart: 'workspace-chart',
						'market-data': 'workspace-market-data',
						ticket: 'workspace-ticket',
						activity: 'workspace-activity'
					};
					if (focusId[options.name as PanelName]) {
						element.id = focusId[options.name as PanelName] as string;
						element.tabIndex = -1;
						element.setAttribute('aria-label', `${options.name} workspace panel`);
					}
					return {
						element,
						init: (params: { params: Record<string, unknown> }) => {
							instance = mount(component, { target: element, props: params.params });
						},
						dispose: () => { if (instance) unmount(instance); }
					};
				}
			});
			restore();
			synchronizePanelVisibility();
			api.layout(host.clientWidth, host.clientHeight, true);
			applyLock();
			const listener = api.onDidLayoutChange(() => persist());
			layoutSubscription = () => listener.dispose();
			const panelAdded = api.onDidAddPanel(({ panel }) => {
				if (!panel?.group) return;
				panel.group.api.locked = $workspaceLocked;
				panel.group.header.hidden = $workspaceLocked;
			});
			panelAddedSubscription = () => panelAdded.dispose();
			panelSubscription = workspacePanels.subscribe(() => {
				if (api && subscriptionsReady) synchronizePanelVisibility();
			});
			presetSubscription = workspacePreset.subscribe(() => {
				if (saveTimer) clearTimeout(saveTimer);
				if (api && subscriptionsReady) { restore(); applyLock(); }
			});
			lockSubscription = workspaceLocked.subscribe(() => {
				if (!api || !subscriptionsReady) return;
				if (saveTimer) clearTimeout(saveTimer);
				applyLock();
				synchronizePanelVisibility();
			});
			window.addEventListener('vice:workspace-layout-reset', resetWorkspace);
			subscriptionsReady = true;
		});

		return () => {
			disposed = true;
			if (saveTimer) clearTimeout(saveTimer);
			layoutSubscription?.();
			panelSubscription?.();
			presetSubscription?.();
			lockSubscription?.();
			panelAddedSubscription?.();
			window.removeEventListener('vice:workspace-layout-reset', resetWorkspace);
			stopRuntimeHealthTelemetry();
			api?.dispose();
		};
	});
</script>

<div bind:this={host} class="dockview-theme-abyss h-full w-full min-h-0 min-w-0 bg-terminal-bg" class:workspace-customizing={!$workspaceLocked} data-testid="workspace-host" data-layout-mode={$workspaceLocked ? 'view' : 'edit'}></div>