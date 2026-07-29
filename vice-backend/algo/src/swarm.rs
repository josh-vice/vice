use anyhow::Result;
use std::sync::Arc;
use tracing::info;
use vice_core::{AlgoJob, JobStatus, OrderType, Side};
use vice_dex_trait::{execute_intent, DexAdapter};

use crate::market::resolve_price;

pub async fn run_swarm(adapter: Arc<dyn DexAdapter>, job: &mut AlgoJob) -> Result<()> {
    let config = job
        .intent
        .algo
        .as_ref()
        .map(|a| a.config.clone())
        .unwrap_or_default();
    let orders = config
        .get("swarmOrders")
        .and_then(|v| v.as_u64())
        .unwrap_or(8)
        .max(1) as u32;
    let spread_pct = config
        .get("swarmSpread")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.5)
        / 100.0;

    let coin = job.intent.api_coin.clone();
    let center = resolve_price(adapter.as_ref(), &coin, job.intent.price).await?;
    let slice_size = job.intent.size / orders as f64;

    job.slices_total = orders;
    info!(job_id = %job.id, %coin, orders, spread_pct, center, "starting Swarm");

    for i in 0..orders {
        let t = if orders > 1 {
            i as f64 / (orders - 1) as f64
        } else {
            0.5
        };

        let price = match job.intent.side {
            Side::Buy => center * (1.0 - spread_pct + t * spread_pct),
            Side::Sell => center * (1.0 + t * spread_pct),
        };

        let mut slice = job.intent.clone();
        slice.size = slice_size;
        slice.price = Some(price);
        slice.order_type = OrderType::Limit;
        slice.post_only = true;

        execute_intent(adapter.as_ref(), &slice).await?;
        job.slices_done = i + 1;
    }

    job.status = JobStatus::Completed;
    Ok(())
}
