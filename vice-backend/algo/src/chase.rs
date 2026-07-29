use anyhow::Result;
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tracing::{info, warn};
use vice_core::{AlgoJob, JobStatus, OrderType, Side};
use vice_dex_trait::{execute_intent, Bbo, DexAdapter};

use crate::market::infer_tick;

fn chase_price(side: Side, bbo: Bbo, offset_ticks: f64, tick: f64) -> f64 {
    let offset = offset_ticks * tick;
    match side {
        Side::Buy => {
            let target = bbo.best_bid + offset;
            let cap = bbo.best_ask - tick;
            if cap > bbo.best_bid {
                target.min(cap)
            } else {
                bbo.best_bid
            }
        }
        Side::Sell => {
            let target = bbo.best_ask - offset;
            let floor = bbo.best_bid + tick;
            if floor < bbo.best_ask {
                target.max(floor)
            } else {
                bbo.best_ask
            }
        }
    }
}

pub async fn run_chase(adapter: Arc<dyn DexAdapter>, job: &mut AlgoJob) -> Result<()> {
    let config = job
        .intent
        .algo
        .as_ref()
        .map(|a| a.config.clone())
        .unwrap_or_default();
    let offset_ticks = config
        .get("chaseOffset")
        .and_then(|v| v.as_f64())
        .unwrap_or(1.0);
    let max_chases = config
        .get("chaseMaxChases")
        .and_then(|v| v.as_u64())
        .unwrap_or(20) as u32;
    let poll_ms = config
        .get("chasePollMs")
        .and_then(|v| v.as_u64())
        .unwrap_or(2000);

    let coin = job.intent.api_coin.clone();

    job.slices_total = max_chases;

    info!(job_id = %job.id, %coin, max_chases, "starting Chase");

    for i in 0..max_chases {
        let bbo = match adapter.fetch_bbo(&coin).await {
            Ok(bbo) => bbo,
            Err(err) => {
                warn!(job_id = %job.id, %coin, %err, "BBO fetch failed, retrying");
                sleep(Duration::from_millis(poll_ms)).await;
                continue;
            }
        };

        let tick = infer_tick(bbo);
        let price = chase_price(job.intent.side, bbo, offset_ticks, tick);

        let mut slice = job.intent.clone();
        slice.price = Some(price);
        slice.order_type = OrderType::Limit;
        slice.post_only = true;

        execute_intent(adapter.as_ref(), &slice).await?;
        job.slices_done = i + 1;

        if i + 1 < max_chases {
            sleep(Duration::from_millis(poll_ms)).await;
        }
    }

    job.status = JobStatus::Completed;
    Ok(())
}
