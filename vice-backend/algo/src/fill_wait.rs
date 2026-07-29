use std::time::Instant;

use anyhow::{anyhow, Result};
use tokio::time::{sleep, Duration};
use tracing::warn;
use vice_dex_trait::{DexAdapter, OrderFillStatus, OrderLifecycle};

pub async fn wait_for_order_fill(
    adapter: &dyn DexAdapter,
    coin: &str,
    order_id: &str,
    target_size: f64,
    poll_ms: u64,
    timeout_ms: u64,
    missing_grace_ms: u64,
) -> Result<()> {
    let start = Instant::now();
    let mut missing_since: Option<Instant> = None;

    loop {
        let status = adapter.fetch_order_fill_status(coin, order_id).await?;

        if status.slice_complete(target_size) {
            return Ok(());
        }

        if matches!(status.lifecycle, OrderLifecycle::Missing) {
            let missing_start = missing_since.get_or_insert_with(Instant::now);
            if missing_start.elapsed().as_millis() as u64 >= missing_grace_ms
                && status.filled <= OrderFillStatus::EPS
            {
                return Err(anyhow!("order {order_id} not found after placement"));
            }
        } else {
            missing_since = None;
        }

        if timeout_ms > 0 && start.elapsed().as_millis() as u64 >= timeout_ms {
            warn!(
                order_id,
                coin,
                target_size,
                filled = status.filled,
                "iceberg slice fill timeout"
            );
            return Err(anyhow!("fill timeout for order {order_id}"));
        }

        sleep(Duration::from_millis(poll_ms)).await;
    }
}
