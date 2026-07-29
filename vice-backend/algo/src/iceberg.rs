use std::sync::Arc;

use anyhow::{anyhow, Result};
use tokio::time::{sleep, Duration};
use tracing::{info, warn};
use vice_core::{AlgoJob, JobStatus, OrderType};
use vice_dex_trait::{execute_intent, DexAdapter};

use crate::fill_wait::wait_for_order_fill;
use crate::market::resolve_price;

pub async fn run_iceberg(adapter: Arc<dyn DexAdapter>, job: &mut AlgoJob) -> Result<()> {
    let config = job
        .intent
        .algo
        .as_ref()
        .map(|a| a.config.clone())
        .unwrap_or_default();
    let display_size = config
        .get("icebergDisplaySize")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.1)
        .max(1e-8);
    let wait_for_fill = config
        .get("icebergWaitForFill")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let poll_ms = config
        .get("icebergFillPollMs")
        .and_then(|v| v.as_u64())
        .unwrap_or(500);
    let timeout_ms = config
        .get("icebergFillTimeoutMs")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let refill_ms = config
        .get("icebergRefillMs")
        .and_then(|v| v.as_u64())
        .unwrap_or(1500);

    let coin = job.intent.api_coin.clone();
    let price = resolve_price(adapter.as_ref(), &coin, job.intent.price).await?;
    let total = job.intent.size;
    let chunks = ((total / display_size).ceil() as u32).max(1);

    job.slices_total = chunks;
    info!(
        job_id = %job.id,
        %coin,
        chunks,
        display_size,
        price,
        wait_for_fill,
        "starting Iceberg"
    );

    let mut remaining = total;
    for i in 0..chunks {
        let slice_size = remaining.min(display_size);
        remaining -= slice_size;

        let mut slice = job.intent.clone();
        slice.size = slice_size;
        slice.price = Some(price);
        slice.order_type = OrderType::Limit;
        slice.post_only = job.intent.post_only;

        let response = execute_intent(adapter.as_ref(), &slice).await?;
        if !response.ok {
            job.status = JobStatus::Failed;
            return Err(anyhow!(
                "{}",
                response
                    .error
                    .unwrap_or_else(|| "iceberg slice placement failed".into())
            ));
        }

        if wait_for_fill {
            let order_id = response
                .venue_order_ids
                .first()
                .ok_or_else(|| anyhow!("no order id returned for iceberg slice"))?;

            if let Err(err) = wait_for_order_fill(
                adapter.as_ref(),
                &coin,
                order_id,
                slice_size,
                poll_ms,
                timeout_ms,
                10_000,
            )
            .await
            {
                warn!(job_id = %job.id, %order_id, %err, "iceberg slice fill wait failed");
                job.status = JobStatus::Failed;
                return Err(err);
            }
        } else if remaining > 1e-8 && i + 1 < chunks {
            sleep(Duration::from_millis(refill_ms)).await;
        }

        job.slices_done = i + 1;
    }

    job.status = JobStatus::Completed;
    Ok(())
}
