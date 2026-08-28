#!/usr/bin/env bun
const path = process.env.VICE_SOAK_MAINNET_EVIDENCE?.trim();
const expectedSha = process.env.VICE_RELEASE_SHA?.trim();
if (!path || !expectedSha) throw new Error('VICE_SOAK_MAINNET_EVIDENCE and VICE_RELEASE_SHA are required for mainnet soak certification');
if (!/^[a-f0-9]{40}$/i.test(expectedSha)) throw new Error('VICE_RELEASE_SHA must be a full commit SHA');
let evidence;
try { evidence = JSON.parse(await Bun.file(path).text()); } catch { throw new Error('mainnet soak evidence must be valid JSON'); }
if (evidence.network !== 'mainnet' || evidence.captureMode !== 'live-mainnet' || !evidence.provider || evidence.commit !== expectedSha || evidence.releaseBuild !== expectedSha) throw new Error('mainnet soak evidence network, capture mode, provider, or build identity does not match');
if (evidence.streamHours < 24 || evidence.browserHours < 2 || evidence.reconnectCycles < 100) throw new Error('mainnet soak evidence is below the required duration or reconnect count');
if (evidence.observedFrames < 1 || !Number.isFinite(evidence.firstSourceTimestamp) || !Number.isFinite(evidence.lastSourceTimestamp)) throw new Error('mainnet soak evidence is missing live frame timestamps');
if (evidence.boundedMemory !== true || evidence.boundedQueues !== true || evidence.noStaleOverwrite !== true || evidence.noDuplicateEvents !== true || evidence.cleanup !== true) throw new Error('mainnet soak evidence does not prove bounded recovery and cleanup');
