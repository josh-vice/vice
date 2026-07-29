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
	import { loadWorkspaceLayout, removeWorkspaceLayout, saveWorkspaceLayout } from '$lib/workspaceLayout';
	import { workspacePanels, workspacePreset } from '$lib/workspacePreset';
	import { chartTimeframe, selectedMarket } from '$lib/stores';
	import { startRuntimeHealthTelemetry } from '$lib/native/performance';
	import { loadWorkspaceLinkContexts, setWorkspaceLinkContext, WORKSPACE_LINK_GROUPS } from '$lib/workspaceLinks';
	import 'dockview/dist/styles/dockview.css';

	type PanelName = 'watchlist' | 'chart' | 'market-data' | 'ticket' | 'activity' | 'market-snapshot';
	let host: HTMLDivElement;

	const componentFor: Record<PanelName, any> = {
		watchlist: MarketWatchlist,
		chart: Chart,
		'market-data': MarketDataWorkspacePanel,
		ticket: OrderTicket,
		activity: BottomPanel,
		'market-snapshot': MarketSnapshotPanel
	};

	onMount(() => {
		let disposed = false;
		let saveTimer: ReturnType<typeof setTimeout> | undefined;
		let layoutSubscription: (() => void) | undefined;
		let panelSubscription: (() => void) | undefined;
		let presetSubscription: (() => void) | undefined;
		let api: DockviewApi | undefined;
		let subscriptionsReady = false;
		const stopRuntimeHealthTelemetry = startRuntimeHealthTelemetry();
		loadWorkspaceLinkContexts();

		const persist = () => {
			if (disposed || !api) return;
			const layout = api.toJSON() as Record<string, unknown>;
			// Floating and popout groups are transient views. Persisting either can
			// make a later restore treat a detached group as the trader's primary
			// workspace, so wait for it to return to the normal grid instead.
			if (Array.isArray(layout.floatingGroups) || Array.isArray(layout.popoutGroups)) return;
			if (saveTimer) clearTimeout(saveTimer);
			saveTimer = setTimeout(() => saveWorkspaceLayout($workspacePreset, layout), 150);
		};

		const createDefaultLayout = () => {
			api.clear();
			const chart = api.addPanel({ id: 'chart', component: 'chart', title: 'Chart', minimumWidth: 300 });
			// Build the vertical chart/activity split before adding side columns.
			// Dockview otherwise nests the chart last and can collapse it to its
			// minimum width when a stored layout is rebuilt.
			if ($workspacePanels.bottom) api.addPanel({ id: 'activity', component: 'activity', title: 'Account activity', position: { referencePanel: chart, direction: 'below' }, initialHeight: 250, inactive: true });
			if ($workspacePreset !== 'chart' && $workspacePanels.watchlist) api.addPanel({ id: 'watchlist', component: 'watchlist', title: 'Markets', position: { referencePanel: chart, direction: 'left' }, initialWidth: 280, minimumWidth: 200, inactive: true });
			const ticket = $workspacePreset !== 'chart' && $workspacePanels.ticket
				? api.addPanel({ id: 'ticket', component: 'ticket', title: 'Order ticket', position: { referencePanel: chart, direction: 'right' }, initialWidth: 320, minimumWidth: 280, inactive: true })
				: undefined;
			const marketData = $workspacePreset !== 'chart' && $workspacePanels.marketData
				? api.addPanel({ id: 'market-data', component: 'market-data', title: 'Depth & tape', position: { referencePanel: ticket ?? chart, direction: ticket ? 'left' : 'right' }, initialWidth: 270, minimumWidth: 200, inactive: true })
				: undefined;
			// Dockview's insertion sequence preserves the newest edge panel but can
			// compress its prior sibling. Set all three sibling sizes after its first
			// measured frame, so a fresh default always leaves usable chart, book,
			// and ticket surfaces rather than a 100 px sliver.
			requestAnimationFrame(() => {
				if (disposed) return;
				chart.api.setSize({ width: Math.max(300, host.clientWidth - 870) });
				marketData?.api.setSize({ width: 270 });
				ticket?.api.setSize({ width: 320 });
			});
		};

		const synchronizePanelVisibility = () => {
			if (!api) return;
			const chart = api.getPanel('chart') ?? api.addPanel({ id: 'chart', component: 'chart', title: 'Chart' });
			const desired: Array<{ id: string; component: PanelName; title: string; visible: boolean; position: Record<string, unknown> }> = [
				{ id: 'watchlist', component: 'watchlist', title: 'Markets', visible: $workspacePreset !== 'chart' && $workspacePanels.watchlist, position: { referencePanel: chart, direction: 'left' } },
				{ id: 'market-data', component: 'market-data', title: 'Depth & tape', visible: $workspacePreset !== 'chart' && $workspacePanels.marketData, position: { referencePanel: chart, direction: 'right' } },
				{ id: 'ticket', component: 'ticket', title: 'Order ticket', visible: $workspacePreset !== 'chart' && $workspacePanels.ticket, position: { referencePanel: api.getPanel('market-data') ?? chart, direction: 'right' } },
				{ id: 'activity', component: 'activity', title: 'Account activity', visible: $workspacePanels.bottom, position: { referencePanel: chart, direction: 'below' } }
			];
			for (const panel of desired) {
				const existing = api.getPanel(panel.id);
				if (panel.visible && !existing) api.addPanel({ id: panel.id, component: panel.component, title: panel.title, position: panel.position, inactive: true });
				if (!panel.visible && existing) api.removePanel(existing);
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

		const resetWorkspace = () => {
			if (!api) return;
			removeWorkspaceLayout($workspacePreset);
			createDefaultLayout();
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
				getTabContextMenuItems: ({ panel, api: dockApi }) => [
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
				],
				createComponent: (options: { name: string }) => {
					const component = componentFor[options.name as PanelName];
					if (!component) throw new Error(`Unknown Vice workspace panel: ${options.name}`);
					const element = document.createElement('div');
					element.className = 'h-full w-full min-h-0 min-w-0';
					let instance: ReturnType<typeof mount> | undefined;
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
			const listener = api.onDidLayoutChange(() => persist());
			layoutSubscription = () => listener.dispose();
			panelSubscription = workspacePanels.subscribe(() => {
				if (api && subscriptionsReady) synchronizePanelVisibility();
			});
			presetSubscription = workspacePreset.subscribe(() => {
				if (api && subscriptionsReady) restore();
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
			window.removeEventListener('vice:workspace-layout-reset', resetWorkspace);
			stopRuntimeHealthTelemetry();
			api?.dispose();
		};
	});
</script>

<div bind:this={host} class="dockview-theme-abyss h-full w-full min-h-0 min-w-0 bg-terminal-bg" data-testid="workspace-host"></div>
