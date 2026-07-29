use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderIntent {
    /// Exact Hyperliquid API coin. This is never derived from the display symbol.
    #[serde(alias = "coin")]
    pub api_coin: String,
    pub side: Side,
    #[serde(rename = "type")]
    pub order_type: OrderType,
    pub price: Option<f64>,
    pub trigger_price: Option<f64>,
    pub size: f64,
    pub reduce_only: bool,
    pub post_only: bool,
    pub ioc: bool,
    pub take_profit: Option<f64>,
    pub stop_loss: Option<f64>,
    pub algo: Option<AlgoConfig>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Side {
    Buy,
    Sell,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OrderType {
    Limit,
    Market,
    Stop,
    StopLimit,
    TrailingStop,
    Twap,
    Scale,
    Chase,
    Swarm,
    Iceberg,
    Bracket,
    Oco,
    PingPong,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlgoConfig {
    #[serde(rename = "type")]
    pub algo_type: String,
    pub config: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlgoJob {
    pub id: String,
    pub intent: OrderIntent,
    pub status: JobStatus,
    pub created_at: i64,
    pub slices_done: u32,
    pub slices_total: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Running,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum MarketEvent {
    L2Book {
        api_coin: String,
        bids: Vec<BookLevel>,
        asks: Vec<BookLevel>,
    },
    Trade {
        api_coin: String,
        price: f64,
        size: f64,
        side: Side,
        timestamp: i64,
    },
    Mid {
        api_coin: String,
        price: f64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookLevel {
    pub price: f64,
    pub size: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaceOrderRequest {
    pub api_coin: String,
    pub is_buy: bool,
    pub sz: f64,
    pub limit_px: f64,
    pub reduce_only: bool,
    pub tif: String,
    pub order_type: Option<String>,
    pub trigger_price: Option<f64>,
    pub take_profit: Option<f64>,
    pub stop_loss: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaceOrderResponse {
    pub ok: bool,
    pub error: Option<String>,
    pub venue_order_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    tag = "kind"
)]
pub enum ExecutionCommand {
    Place {
        session_sequence: u64,
        idempotency_key: String,
        api_coin: String,
        is_buy: bool,
        size: f64,
        limit_price: f64,
        reduce_only: bool,
        tif: String,
        order_type: Option<String>,
        trigger_price: Option<f64>,
        take_profit: Option<f64>,
        stop_loss: Option<f64>,
    },
    Cancel {
        session_sequence: u64,
        idempotency_key: String,
        api_coin: String,
        order_id: String,
    },
    Modify {
        session_sequence: u64,
        idempotency_key: String,
        api_coin: String,
        order_id: String,
        new_price: f64,
    },
}

impl ExecutionCommand {
    pub fn session_sequence(&self) -> u64 {
        match self {
            Self::Place {
                session_sequence, ..
            }
            | Self::Cancel {
                session_sequence, ..
            }
            | Self::Modify {
                session_sequence, ..
            } => *session_sequence,
        }
    }

    pub fn idempotency_key(&self) -> &str {
        match self {
            Self::Place {
                idempotency_key, ..
            }
            | Self::Cancel {
                idempotency_key, ..
            }
            | Self::Modify {
                idempotency_key, ..
            } => idempotency_key,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionAck {
    pub command_id: String,
    pub session_id: String,
    pub session_sequence: u64,
    pub idempotency_key: String,
    pub accepted: bool,
    pub error: Option<String>,
    pub venue_order_ids: Vec<String>,
    pub gateway_receive_us: i64,
    pub venue_send_us: i64,
    pub completed_us: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn execution_command_wire_shape_is_stable() {
        let command = ExecutionCommand::Place {
            session_sequence: 7,
            idempotency_key: "key-1".into(),
            api_coin: "BTC".into(),
            is_buy: true,
            size: 0.1,
            limit_price: 100_000.0,
            reduce_only: false,
            tif: "Gtc".into(),
            order_type: Some("limit".into()),
            trigger_price: None,
            take_profit: None,
            stop_loss: None,
        };
        let encoded = serde_json::to_value(command).unwrap();
        assert_eq!(encoded["kind"], "place");
        assert_eq!(encoded["sessionSequence"], 7);
        assert_eq!(encoded["idempotencyKey"], "key-1");
        assert_eq!(encoded["limitPrice"], 100_000.0);
    }

    #[test]
    fn cancellation_and_modification_wire_shapes_use_exact_api_coin() {
        let cancel = serde_json::to_value(ExecutionCommand::Cancel {
            session_sequence: 8,
            idempotency_key: "cancel-1".into(),
            api_coin: "@12".into(),
            order_id: "42".into(),
        })
        .unwrap();
        assert_eq!(cancel["apiCoin"], "@12");
        assert!(cancel.get("symbol").is_none());

        let modify = serde_json::to_value(ExecutionCommand::Modify {
            session_sequence: 9,
            idempotency_key: "modify-1".into(),
            api_coin: "HIP3:XYZ".into(),
            order_id: "43".into(),
            new_price: 1.25,
        })
        .unwrap();
        assert_eq!(modify["apiCoin"], "HIP3:XYZ");
        assert!(modify.get("symbol").is_none());
    }

    #[test]
    fn order_intent_requires_and_preserves_exact_api_coin() {
        let intent: OrderIntent = serde_json::from_value(serde_json::json!({
            "apiCoin": "@12",
            "side": "buy",
            "type": "limit",
            "price": 1.25,
            "size": 2.0,
            "reduceOnly": false,
            "postOnly": true,
            "ioc": false
        }))
        .unwrap();
        assert_eq!(intent.api_coin, "@12");
    }
}
