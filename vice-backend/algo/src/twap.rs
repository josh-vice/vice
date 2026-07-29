use anyhow::Result;
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tracing::info;
use vice_core::{AlgoJob, JobStatus};
use vice_dex_trait::{execute_intent, DexAdapter};

pub async fn run_twap(adapter: Arc<dyn DexAdapter>, job: &mut AlgoJob) -> Result<()> {
    let config = job
        .intent
        .algo
        .as_ref()
        .map(|a| a.config.clone())
        .unwrap_or_default();
    let duration_min = config
        .get("twapDuration")
        .and_then(|v| v.as_f64())
        .unwrap_or(30.0);
    let intervals = config
        .get("twapIntervals")
        .and_then(|v| v.as_u64())
        .unwrap_or(10) as u32;
    let randomize = config
        .get("twapRandomize")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    job.slices_total = intervals;
    let slice_size = job.intent.size / intervals as f64;
    let base_interval_ms = (duration_min * 60.0 * 1000.0 / intervals as f64) as u64;

    info!(job_id = %job.id, intervals, "starting TWAP");

    for i in 0..intervals {
        let mut slice_intent = job.intent.clone();
        slice_intent.size = slice_size;
        slice_intent.order_type = vice_core::OrderType::Limit;

        execute_intent(adapter.as_ref(), &slice_intent).await?;
        job.slices_done = i + 1;

        if i + 1 < intervals {
            let jitter = if randomize {
                (rand_jitter() * base_interval_ms as f64 * 0.2) as i64
            } else {
                0
            };
            let wait = (base_interval_ms as i64 + jitter).max(100) as u64;
            sleep(Duration::from_millis(wait)).await;
        }
    }

    job.status = JobStatus::Completed;
    Ok(())
}

fn rand_jitter() -> f64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .subsec_nanos();
    (nanos as f64 / 1e9) * 2.0 - 1.0
}
