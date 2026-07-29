use anyhow::Result;
use async_trait::async_trait;
use vice_core::{MarketEvent, OrderIntent, PlaceOrderRequest, PlaceOrderResponse};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Bbo {
    pub best_bid: f64,
    pub best_ask: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrderLifecycle {
    Open,
    Partial,
    Filled,
    Missing,
}

#[derive(Debug, Clone, Copy)]
pub struct OrderFillStatus {
    pub filled: f64,
    pub remaining: f64,
    pub original_size: f64,
    pub lifecycle: OrderLifecycle,
}

impl OrderFillStatus {
    pub const EPS: f64 = 1e-8;

    pub fn slice_complete(&self, target_size: f64) -> bool {
        if self.filled + Self::EPS >= target_size {
            return true;
        }
        self.lifecycle == OrderLifecycle::Filled && self.filled > Self::EPS
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DexId {
    Hyperliquid,
    Lighter,
    Nado,
    Derive,
}

#[async_trait]
pub trait DexAdapter: Send + Sync {
    fn id(&self) -> DexId;

    async fn subscribe_market(&self, api_coin: &str) -> Result<()>;

    async fn place_order(&self, req: PlaceOrderRequest) -> Result<PlaceOrderResponse>;

    async fn cancel_order(&self, api_coin: &str, order_id: &str) -> Result<()>;

    async fn modify_order(&self, api_coin: &str, order_id: &str, new_price: f64) -> Result<()>;

    /// Best bid/ask for chase and pegged algos.
    async fn fetch_bbo(&self, api_coin: &str) -> Result<Bbo>;

    /// Open-order / fill snapshot for a venue order id (iceberg refill, etc.).
    async fn fetch_order_fill_status(&self, api_coin: &str, order_id: &str) -> Result<OrderFillStatus>;

    /// Normalize a raw exchange event into Vice Terminal schema.
    fn normalize_event(&self, raw: &str) -> Option<MarketEvent>;
}

/// Route an OrderIntent to the correct DEX adapter.
pub async fn execute_intent(
    adapter: &dyn DexAdapter,
    intent: &OrderIntent,
) -> Result<PlaceOrderResponse> {
    let is_buy = intent.side == vice_core::Side::Buy;

    let tif = if intent.post_only {
        "Alo"
    } else if intent.ioc {
        "Ioc"
    } else {
        "Gtc"
    };

    let limit_px = intent.price.unwrap_or(0.0);

    adapter
        .place_order(PlaceOrderRequest {
            api_coin: intent.api_coin.clone(),
            is_buy,
            sz: intent.size,
            limit_px,
            reduce_only: intent.reduce_only,
            tif: tif.to_string(),
            order_type: Some(format!("{:?}", intent.order_type).to_lowercase()),
            trigger_price: intent.trigger_price,
            take_profit: intent.take_profit,
            stop_loss: intent.stop_loss,
        })
        .await
}
