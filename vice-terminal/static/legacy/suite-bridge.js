/*
 * Transitional Hub boundary. The Hub remains a preserved vanilla island while
 * its widgets are incrementally ported; it accepts only a public, exact market
 * context from the same-origin SvelteKit shell. It never receives wallet,
 * account, credential, order, or signing state.
 */
(() => {
  'use strict';
  const TYPE = 'vice-suite-context';
  const VERSION = 1;

  function validMarket(market) {
    return market == null || (
      typeof market === 'object' &&
      typeof market.marketKey === 'string' && market.marketKey.length > 0 &&
      typeof market.apiCoin === 'string' && market.apiCoin.length > 0 &&
      typeof market.kind === 'string'
    );
  }

  function validContext(value) {
    return value && value.version === VERSION && value.context &&
      value.context.market && validMarket(value.context.market.market) &&
      typeof value.context.market.venue === 'string' &&
      typeof value.context.market.timeframe === 'string' &&
      typeof value.context.market.dataStatus === 'string' &&
      typeof value.context.market.catalogStatus === 'string';
  }

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || !validContext(event.data) || event.data.type !== TYPE) return;
    window.viceSuitePublicContext = Object.freeze(event.data.context);
    window.dispatchEvent(new CustomEvent(TYPE, { detail: window.viceSuitePublicContext }));

    const market = window.viceSuitePublicContext.market.market;
    const trade = document.getElementById('hub-open-trade');
    if (!trade || !market || market.tradingAvailability === 'metadataOnly' || market.instrument?.venue !== 'hyperliquid') return;
    const timeframe = window.viceSuitePublicContext.market.timeframe;
    if (!['1m', '5m', '15m', '1h', '4h', '1D'].includes(timeframe)) return;
    const handoff = { version: VERSION, venue: 'hyperliquid', marketKey: market.marketKey, apiCoin: market.apiCoin, kind: market.kind, timeframe };
    trade.disabled = false;
    trade.onclick = () => {
      window.top.location.assign(`/trade?handoff=${encodeURIComponent(JSON.stringify(handoff))}`);
    };
  });

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'vice-suite-hub-ready', version: VERSION }, window.location.origin);
  }
})();
