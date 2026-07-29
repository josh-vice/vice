use anyhow::Result;
use std::sync::Arc;
use tracing::info;
use vice_core::{AlgoJob, JobStatus, OrderType};
use vice_dex_trait::{execute_intent, DexAdapter};

pub async fn run_scale(adapter: Arc<dyn DexAdapter>, job: &mut AlgoJob) -> Result<()> {
    let config = job
        .intent
        .algo
        .as_ref()
        .map(|a| a.config.clone())
        .unwrap_or_default();
    let levels = config
        .get("scaleLevels")
        .and_then(|v| v.as_u64())
        .unwrap_or(5) as u32;
    let start = config
        .get("scaleStartPrice")
        .and_then(|v| v.as_f64())
        .unwrap_or(job.intent.price.unwrap_or(0.0));
    let end = config
        .get("scaleEndPrice")
        .and_then(|v| v.as_f64())
        .unwrap_or(start);
    let skew = config
        .get("scaleSkew")
        .and_then(|v| v.as_f64())
        .unwrap_or(1.0);

    job.slices_total = levels;
    let step = if levels > 1 {
        (end - start) / (levels - 1) as f64
    } else {
        0.0
    };

    // Skew sizes: more size at start or end depending on skew
    let total_weight: f64 = (0..levels).map(|i| skew.powi(i as i32)).sum();
    let total_size = job.intent.size;

    info!(job_id = %job.id, levels, start, end, "starting Scale");

    for i in 0..levels {
        let price = start + step * i as f64;
        let weight = skew.powi(i as i32);
        let slice_size = total_size * weight / total_weight;

        let mut slice = job.intent.clone();
        slice.size = slice_size;
        slice.price = Some(price);
        slice.order_type = OrderType::Limit;

        execute_intent(adapter.as_ref(), &slice).await?;
        job.slices_done = i + 1;
    }

    job.status = JobStatus::Completed;
    Ok(())
}
