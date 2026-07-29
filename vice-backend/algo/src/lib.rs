mod chase;
mod fill_wait;
mod iceberg;
mod market;
mod ping_pong;
mod scale;
mod swarm;
mod twap;

pub use chase::run_chase;
pub use iceberg::run_iceberg;
pub use ping_pong::run_ping_pong;
pub use scale::run_scale;
pub use swarm::run_swarm;
pub use twap::run_twap;

use anyhow::Result;
use std::sync::Arc;
use vice_core::{AlgoJob, JobStatus, OrderIntent, OrderType};
use vice_dex_trait::DexAdapter;

pub async fn run_algo(adapter: Arc<dyn DexAdapter>, mut job: AlgoJob) -> Result<AlgoJob> {
    match job.intent.order_type {
        OrderType::Twap => run_twap(adapter, &mut job).await?,
        OrderType::Scale => run_scale(adapter, &mut job).await?,
        OrderType::Chase => run_chase(adapter, &mut job).await?,
        OrderType::Swarm => run_swarm(adapter, &mut job).await?,
        OrderType::Iceberg => run_iceberg(adapter, &mut job).await?,
        OrderType::PingPong => run_ping_pong(adapter, &mut job).await?,
        _ => {
            job.status = JobStatus::Failed;
        }
    }
    Ok(job)
}

pub fn intent_from_json(value: serde_json::Value) -> Result<OrderIntent> {
    Ok(serde_json::from_value(value)?)
}
