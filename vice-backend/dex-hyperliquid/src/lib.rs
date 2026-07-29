use anyhow::{anyhow, Result};
use async_trait::async_trait;
use vice_core::{MarketEvent, PlaceOrderRequest, PlaceOrderResponse};
use vice_dex_trait::{Bbo, DexAdapter, DexId, OrderFillStatus};

/// Closed Rust adapter boundary.
///
/// Hyperliquid signing and execution are intentionally owned by the browser's
/// wallet-controlled local agent. Keeping this adapter closed prevents an
/// accidental return of server-side custody or a SvelteKit execution sidecar.
pub struct HyperliquidAdapter;

impl HyperliquidAdapter {
    pub fn new(_unused: impl Into<String>) -> Self {
        Self
    }
}

#[async_trait]
impl DexAdapter for HyperliquidAdapter {
    fn id(&self) -> DexId {
        DexId::Hyperliquid
    }

    async fn subscribe_market(&self, _api_coin: &str) -> Result<()> {
        Ok(())
    }

    async fn place_order(&self, _req: PlaceOrderRequest) -> Result<PlaceOrderResponse> {
        Ok(PlaceOrderResponse {
            ok: false,
            error: Some(
                "Rust Hyperliquid execution is disabled; use the local wallet signer".into(),
            ),
            venue_order_ids: Vec::new(),
        })
    }

    async fn cancel_order(&self, _api_coin: &str, _order_id: &str) -> Result<()> {
        Err(anyhow!(
            "Rust Hyperliquid execution is disabled; use the local wallet signer"
        ))
    }

    async fn modify_order(&self, _api_coin: &str, _order_id: &str, _new_price: f64) -> Result<()> {
        Err(anyhow!(
            "Rust Hyperliquid execution is disabled; use the local wallet signer"
        ))
    }

    async fn fetch_bbo(&self, _api_coin: &str) -> Result<Bbo> {
        Err(anyhow!(
            "Rust Hyperliquid market access is disabled; use browser subscriptions"
        ))
    }

    async fn fetch_order_fill_status(
        &self,
        _api_coin: &str,
        _order_id: &str,
    ) -> Result<OrderFillStatus> {
        Err(anyhow!(
            "Rust Hyperliquid account access is disabled; use browser reconciliation"
        ))
    }

    fn normalize_event(&self, _raw: &str) -> Option<MarketEvent> {
        None
    }
}

/// Placeholder adapters for future DEX integrations.
pub struct LighterAdapter;
pub struct NadoAdapter;

#[async_trait]
impl DexAdapter for LighterAdapter {
    fn id(&self) -> DexId {
        DexId::Lighter
    }
    async fn subscribe_market(&self, _: &str) -> Result<()> {
        Ok(())
    }
    async fn place_order(&self, _: PlaceOrderRequest) -> Result<PlaceOrderResponse> {
        Ok(PlaceOrderResponse {
            ok: false,
            error: Some("Lighter adapter not yet implemented".into()),
            venue_order_ids: Vec::new(),
        })
    }
    async fn cancel_order(&self, _: &str, _: &str) -> Result<()> {
        Err(anyhow!("not implemented"))
    }
    async fn modify_order(&self, _: &str, _: &str, _: f64) -> Result<()> {
        Err(anyhow!("not implemented"))
    }
    async fn fetch_bbo(&self, _: &str) -> Result<Bbo> {
        Err(anyhow!("Lighter BBO not yet implemented"))
    }
    async fn fetch_order_fill_status(&self, _: &str, _: &str) -> Result<OrderFillStatus> {
        Err(anyhow!("Lighter order status not yet implemented"))
    }
    fn normalize_event(&self, _: &str) -> Option<MarketEvent> {
        None
    }
}

#[async_trait]
impl DexAdapter for NadoAdapter {
    fn id(&self) -> DexId {
        DexId::Nado
    }
    async fn subscribe_market(&self, _: &str) -> Result<()> {
        Ok(())
    }
    async fn place_order(&self, _: PlaceOrderRequest) -> Result<PlaceOrderResponse> {
        Ok(PlaceOrderResponse {
            ok: false,
            error: Some("Nado adapter not yet implemented".into()),
            venue_order_ids: Vec::new(),
        })
    }
    async fn cancel_order(&self, _: &str, _: &str) -> Result<()> {
        Err(anyhow!("not implemented"))
    }
    async fn modify_order(&self, _: &str, _: &str, _: f64) -> Result<()> {
        Err(anyhow!("not implemented"))
    }
    async fn fetch_bbo(&self, _: &str) -> Result<Bbo> {
        Err(anyhow!("Nado BBO not yet implemented"))
    }
    async fn fetch_order_fill_status(&self, _: &str, _: &str) -> Result<OrderFillStatus> {
        Err(anyhow!("Nado order status not yet implemented"))
    }
    fn normalize_event(&self, _: &str) -> Option<MarketEvent> {
        None
    }
}
