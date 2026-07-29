use anyhow::Result;
use vice_dex_trait::{Bbo, DexAdapter};

pub fn infer_tick(bbo: Bbo) -> f64 {
    let mid = mid_price(bbo);
    let spread = (bbo.best_ask - bbo.best_bid).max(0.0);
    if spread > 0.0 {
        (spread / 2.0).max(mid * 1e-6)
    } else {
        mid * 1e-4
    }
}

pub fn mid_price(bbo: Bbo) -> f64 {
    (bbo.best_bid + bbo.best_ask) / 2.0
}

pub async fn fetch_mid(adapter: &dyn DexAdapter, coin: &str) -> Result<f64> {
    Ok(mid_price(adapter.fetch_bbo(coin).await?))
}

pub async fn resolve_price(
    adapter: &dyn DexAdapter,
    coin: &str,
    intent_price: Option<f64>,
) -> Result<f64> {
    if let Some(px) = intent_price.filter(|p| *p > 0.0) {
        return Ok(px);
    }
    fetch_mid(adapter, coin).await
}
