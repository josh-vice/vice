use axum::{routing::get, Json, Router};
use serde_json::{json, Value};
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    // Execution and algo routes remain closed until the gateway can exchange
    // authenticated, user-signed child intents. It must never hold a shared key.
    let app = Router::new().route("/health", get(health));
    let addr = std::env::var("VICE_GATEWAY_BIND").unwrap_or_else(|_| "127.0.0.1:8080".into());
    info!("vice-backend listening on {addr}");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "service": "vice-backend",
        "serviceId": std::env::var("VICE_SERVICE_ID").unwrap_or_else(|_| "vice-backend-dev".into()),
        "execution": "disabled_pending_signed_intents",
        "custody": "no_shared_hyperliquid_key"
    }))
}
