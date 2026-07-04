#!/usr/bin/env bash
# lt_download_all.sh
# Downloads VTT + extracts frames for all 83 Liquidity Theory videos.
# Pure shell — no LLM. Skips videos that already have a manifest.json.
# Writes progress to /tmp/lt_download.log and /tmp/lt_progress.json

set -euo pipefail

BASE=~/Desktop/LiquidityTheory_Transcripts
SCRIPT=/Users/pbot/.openclaw/workspace/scripts/lt_process_video.py
LOG=/tmp/lt_download.log
PROGRESS=/tmp/lt_progress.json

mkdir -p "$BASE"

done_count=0
fail_count=0
skip_count=0
total=83

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

save_progress() {
  cat > "$PROGRESS" <<EOF
{
  "done": $done_count,
  "failed": $fail_count,
  "skipped": $skip_count,
  "total": $total,
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

process() {
  local course_dir="$1"
  local folder="$2"
  local vid="$3"
  local out="$BASE/$course_dir/$folder"

  if [ -f "$out/manifest.json" ]; then
    log "SKIP  $folder"
    ((skip_count++)) || true
    save_progress
    return 0
  fi

  mkdir -p "$out"
  log "START $folder ($vid)"

  if python3 "$SCRIPT" "$vid" "$out" >> "$LOG" 2>&1; then
    log "DONE  $folder"
    ((done_count++)) || true
  else
    log "FAIL  $folder ($vid)"
    ((fail_count++)) || true
    # Write a stub manifest so analysis phase can note the failure
    echo '{"video_id":"'"$vid"'","has_transcript":false,"error":"download_failed","chunks":[]}' > "$out/manifest.json"
  fi
  save_progress
}

echo "========================================" >> "$LOG"
log "LT Download ALL started"
log "Total videos: $total"

# ── Course 1: Laying The Foundation ─────────────────────────────────────────
C1=Course1_Laying_The_Foundation
process $C1 01_The_Tools_of_The_Trade_Introduction  gviP3aKGdy4
process $C1 02_Understanding_Price_Action             hbQ6Pvauixs
process $C1 03_Components_of_a_Market                lx-kTGQxhIs
process $C1 04_Support_and_Resistance                jUKafxO9A4Q
process $C1 05_Trending_Markets                      fLM29ArLZsI
process $C1 06_Rangebound_Markets                    nr3a5REunRY
process $C1 07_What_is_Market_Structure              1OfaKpSl8YI
process $C1 08_Identifying_Market_Structure          bz5NO9P9nGE
process $C1 09_Timeframes                            ea3Upvs-Csg
process $C1 10_HTF_Scenario                          TD3i7Rv130E
process $C1 11_LTF_Scenario                          JUmnSxywtt4
process $C1 12_Risk_Management                       g7EEkEWQQI4
process $C1 13_Achieving_Profitability               eNFuYFTQ53E
process $C1 14_Optimizing_Returns                    WwLYeQPy9vE
process $C1 15_Outro                                 mQJKUc7v2U8

# ── Course 2: Building Your Toolbox ─────────────────────────────────────────
C2=Course2_Building_Your_Toolbox
process $C2 01_Trading_Styles                        cVGeGAeHl1I
process $C2 02_Introduction                          7r6JuZQcZcw
process $C2 03_Types_of_Trades                       qQUyNbupNjU
process $C2 04_Entering_Trades                       3xhRlMRh1P4
process $C2 05_Exiting_Trades                        HoXfz4Av21E
process $C2 06_Price_Action_Formations               V5gjA0gtB0c
process $C2 07_Price_Action_Examples                 C9mMKb8Fa2s
process $C2 08_Volume_Analysis                       _e_IdqS3Fc0
process $C2 09_Volume_Examples                       65VTOnegdKA
process $C2 10_Classical_Chart_Patterns              j1aBq0tLg2o
process $C2 11_Classical_Pattern_Examples            XaKbiC8pnRc
process $C2 12_Fibonacci                             RZjYkrjOqt0
process $C2 13_Ichimoku_Kinko_Hyo                    DwSbAuSXYS4
process $C2 14_Ichimoku_Market_Scenario              9vwuGWB9bic
process $C2 15_Oscillators                           A7tYHQ9k_6A
process $C2 16_Financial_Instruments                 3Q-zoy2UTdQ
process $C2 17_Outro                                 25mpIMBHqUI

# ── Course 3: Sharpening Your Edge ──────────────────────────────────────────
C3=Course3_Sharpening_Your_Edge
process $C3 01_Introduction                          qkn6m6QhyR8
process $C3 02_Order_Types                           eJur_mprEWg
process $C3 03_Deposit_and_Withdraw                  bcQgBiRmmRo
process $C3 04_Understanding_the_Orderbook           9-4WMH2Sv6Q
process $C3 05_Getting_into_Positions                MdbfWpG_J0s
process $C3 06_Executing_Orders                      8L1gojZJY9M
process $C3 07_Understanding_Contracts               GLuLKS1Za8k
process $C3 08_Understanding_Leverage                _OyZcObnIos
process $C3 09_Applying_Leverage                     FaU31BaTLNM
process $C3 10_Margin_Management                     osmzWYAzgFs
process $C3 11_Identifying_Access_Points             vMSQY_JDXr4
process $C3 12_Trading_SR                            1lDySYkzFpo
process $C3 13_Trading_Ranges                        rkB5LZmWGak
process $C3 14_Range_Market_Scenario                 pZRnkcfs6s0
process $C3 15_Crafting_Your_System                  hZC0WUZl_Ls
process $C3 16_Applying_Your_System                  s1RBM13ETf0
process $C3 17_Recording_Your_System                 2B4s94zhi-0
process $C3 18_Developing_a_Traders_Mindset          oAj3-5TFdBg
process $C3 19_The_Art_of_Meditation                 ts3f-hXELPE
process $C3 20_The_Reality_Behind_Trading_Fulltime   JzJGzu2MJfE
process $C3 21_Outro                                 rWck3H53m18

# ── Course 4: Liquidity Theory ───────────────────────────────────────────────
C4=Course4_Liquidity_Theory
process $C4 01_Introduction                          7KPVUXvJn-w
process $C4 02_Liquidity_Theory                      VurfjWXZ43w
process $C4 03_Identifying_Liquidity                 hxkdu-ZfmpA
process $C4 04_Liquidity_Structures                  l5APwZw8f28
process $C4 05_Liquidity_Scenarios                   7w2Zq779mO4
process $C4 06_Who_is_in_Control_Primer              Gml6s3MB1lk
process $C4 07_Sentiment_Analysis_Variables          2NXUyB2e8Kg
process $C4 08_Funding_Rate                          K1oJYbsyOTk
process $C4 09_Open_Interest                         L0ZYzzbQteY
process $C4 10_Cumulative_Delta                      7nvinS23xaY
process $C4 11_Future_Basis                          Y6-VWGeitV0
process $C4 12_Applying_Sentiment                    Jpty5yuVFqA
process $C4 13_Trend_Buddy                           Ke6I9iuyAVE
process $C4 14_PAL                                   zLaxSnpFfyQ
process $C4 15_Heuristics                            nuWGOXYVWVc
process $C4 16_FSVZO                                 IoxmIP6tjsQ
process $C4 17_Crayons                               nwZR1qanLs0
process $C4 18_Genie                                 a3Aog1SdWxQ
process $C4 19_Platform_Overview                     T6aLiQQ1TAs
process $C4 20_Liquidation_Levels                    EFGMS3idY1M
process $C4 21_Liquidation_Level_Scenario            x7cvT7vxE2M
process $C4 22_Positions_Heatmap                     78I9CCMT1Lg
process $C4 23_Combining_Sentiment_Data              m05al1Yd598
process $C4 24_Trading_Activity                      WUEtl6fDJR8
process $C4 25_Hyblock_Indicators                    rpUsmN4eTWE
process $C4 26_Kijun_Sen                             ieQGvviW-N8
process $C4 27_C_Clamps_and_Kumo_Pockets             d0izvW6996I
process $C4 28_Edge_to_Edge                          KpvozoObhR4
process $C4 29_Ichimoku_Market_Scenario              MdWiEYBAeas
process $C4 30_Outro                                 sWq6Y8v4hMU

log "=========================================="
log "FINISHED: done=$done_count  failed=$fail_count  skipped=$skip_count / $total"
echo "COMPLETE" > /tmp/lt_download_complete
save_progress
