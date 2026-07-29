use anyhow::Result;
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tracing::info;
use vice_core::{AlgoJob, JobStatus, OrderType, Side};
use vice_dex_trait::{execute_intent, DexAdapter};

use crate::market::resolve_price;

pub async fn run_ping_pong(adapter: Arc<dyn DexAdapter>, job: &mut AlgoJob) -> Result<()> {
    let config = job
        .intent
        .algo
        .as_ref()
        .map(|a| a.config.clone())
        .unwrap_or_default();
    let range_pct = config
        .get("pingPongRange")
        .and_then(|v| v.as_f64())
        .unwrap_or(1.0)
        / 100.0;
    let cycles = config
        .get("pingPongCycles")
        .and_then(|v| v.as_u64())
        .unwrap_or(5)
        .max(1) as u32;
    let pause_ms = config
        .get("pingPongPauseMs")
        .and_then(|v| v.as_u64())
        .unwrap_or(2000);

    let coin = job.intent.api_coin.clone();
    let center = resolve_price(adapter.as_ref(), &coin, job.intent.price).await?;
    let buy_price = center * (1.0 - range_pct / 2.0);
    let sell_price = center * (1.0 + range_pct / 2.0);

    job.slices_total = cycles * 2;
    info!(job_id = %job.id, %coin, cycles, buy_price, sell_price, "starting Ping Pong");

    let mut slice_idx = 0_u32;
    for _ in 0..cycles {
        for (side, price) in [(Side::Buy, buy_price), (Side::Sell, sell_price)] {
            let mut slice = job.intent.clone();
            slice.side = side;
            slice.size = job.intent.size;
            slice.price = Some(price);
            slice.order_type = OrderType::Limit;
            slice.post_only = true;

            execute_intent(adapter.as_ref(), &slice).await?;
            slice_idx += 1;
            job.slices_done = slice_idx;

            if slice_idx < job.slices_total {
                sleep(Duration::from_millis(pause_ms)).await;
            }
        }
    }

    job.status = JobStatus::Completed;
    Ok(())
}
