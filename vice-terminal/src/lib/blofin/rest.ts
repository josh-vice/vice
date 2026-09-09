import type { CredentialInput } from '$lib/credentials/types';
import { parseVenueError, type SemanticVenueError } from '$lib/execution/venueErrors';
import { signBlofinRest } from './auth';
import { BLOFIN_ENVIRONMENTS, type BlofinEnvironment } from './environment';

export const BLOFIN_REST_TIMEOUT_MS = 7_000;

type BlofinHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type BlofinCredentials = Readonly<CredentialInput>;

/** Supplies decrypted credentials only for the duration of one request callback. */
export type BlofinCredentialCallback = <T>(
	callback: (credentials: BlofinCredentials) => T | PromiseLike<T>
) => Promise<T>;

export interface BlofinRestRequest<TBody = unknown> {
	environment: BlofinEnvironment;
	method: string;
	requestPath: string;
	credentials: BlofinCredentialCallback;
	body?: TBody;
	signal?: AbortSignal;
}

export interface BlofinRestResponse<T> {
	code: string;
	msg: string;
	data: T;
}

export class BlofinRestError extends Error {
	readonly semantic: SemanticVenueError;
	readonly blofinCode?: string;
	readonly status?: number;

	constructor(
		semantic: SemanticVenueError,
		options: { blofinCode?: string; status?: number } = {}
	) {
		super(semantic.message);
		this.name = 'BlofinRestError';
		this.semantic = semantic;
		this.blofinCode = options.blofinCode;
		this.status = options.status;
	}
}

type UnknownRecord = Record<string, unknown>;
type TimeoutSignalApi = typeof AbortSignal & {
	timeout?: (milliseconds: number) => AbortSignal;
	any?: (signals: readonly AbortSignal[]) => AbortSignal;
};

const FORBIDDEN_PATH_SEGMENTS = ['asset', 'transfer', 'withdrawal', 'sub-account'] as const;
const ALLOWED_METHODS = new Set<BlofinHttpMethod>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeDecode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function containsForbiddenPath(pathname: string): boolean {
	const candidates = [pathname.toLowerCase(), safeDecode(pathname).toLowerCase()];
	return candidates.some((candidate) =>
		FORBIDDEN_PATH_SEGMENTS.some((segment) =>
			new RegExp(`/${segment}(?:/|$)`, 'u').test(candidate)
		)
	);
}

function redactSensitiveText(value: string, credentials?: BlofinCredentials): string {
	let safe = value.slice(0, 512);
	const sensitiveValues = credentials
		? [credentials.apiKey, credentials.secret, credentials.passphrase]
		: [];
	for (const sensitiveValue of sensitiveValues) {
		if (typeof sensitiveValue === 'string' && sensitiveValue.length > 0) {
			safe = safe.split(sensitiveValue).join('[redacted]');
		}
	}
	return safe;
}

function classifiedError(
	message: string,
	credentials?: BlofinCredentials,
	options: { blofinCode?: string; status?: number } = {}
): BlofinRestError {
	const safeMessage = redactSensitiveText(message, credentials);
	const semantic = parseVenueError(safeMessage);
	return new BlofinRestError(semantic, options);
}

function assertEnvironment(environment: unknown): asserts environment is BlofinEnvironment {
	if (typeof environment !== 'string' || !Object.prototype.hasOwnProperty.call(BLOFIN_ENVIRONMENTS, environment)) {
		throw new Error('BloFin environment is not allowlisted');
	}
}

function normalizeMethod(method: unknown): BlofinHttpMethod {
	if (typeof method !== 'string') throw new Error('BloFin HTTP method is invalid');
	const normalized = method.toUpperCase();
	if (!ALLOWED_METHODS.has(normalized as BlofinHttpMethod)) throw new Error('BloFin HTTP method is not supported');
	return normalized as BlofinHttpMethod;
}

function assertRequestPath(requestPath: unknown, restBase: string): void {
	if (typeof requestPath !== 'string' || !requestPath.startsWith('/') || requestPath.startsWith('//')) {
		throw new Error('BloFin request path must be relative');
	}
	if (requestPath.includes('#')) throw new Error('BloFin request path must not contain a fragment');

	let parsed: URL;
	try {
		parsed = new URL(requestPath, restBase);
	} catch {
		throw new Error('BloFin request path is invalid');
	}
	if (parsed.origin !== new URL(restBase).origin || containsForbiddenPath(parsed.pathname)) {
		throw new Error('BloFin request path is not allowed');
	}
}

function serializeBody(body: unknown): string {
	if (body === undefined) return '';
	try {
		const serialized = JSON.stringify(body);
		if (typeof serialized !== 'string') throw new Error('not serializable');
		return serialized;
	} catch {
		throw new Error('BloFin request body serialization failed');
	}
}

function createNonce(): string {
	try {
		if (typeof globalThis.crypto?.randomUUID !== 'function') throw new Error('unavailable');
		return globalThis.crypto.randomUUID();
	} catch {
		throw new Error('BloFin request nonce generation failed');
	}
}

function createTimestamp(): string {
	return String(Date.now());
}

function timeoutSignal(): AbortSignal {
	const api = AbortSignal as TimeoutSignalApi;
	if (typeof api.timeout !== 'function') throw new Error('BloFin request timeout is unavailable');
	return api.timeout(BLOFIN_REST_TIMEOUT_MS);
}

function combinedSignal(external: AbortSignal | undefined, timeout: AbortSignal): AbortSignal {
	if (!external) return timeout;
	const api = AbortSignal as TimeoutSignalApi;
	if (typeof api.any === 'function') return api.any([external, timeout]);
	const controller = new AbortController();
	const abort = (event: Event) => controller.abort((event.target as AbortSignal).reason);
	if (external.aborted || timeout.aborted) {
		controller.abort(external.aborted ? external.reason : timeout.reason);
		return controller.signal;
	}
	external.addEventListener('abort', abort, { once: true });
	timeout.addEventListener('abort', abort, { once: true });
	return controller.signal;
}

function responseIsOk(response: Response): boolean {
	return response.ok === true || (response.ok === undefined && response.status >= 200 && response.status < 300);
}

function retryableStatus(status: number): boolean {
	return status === 429 || (status >= 500 && status <= 599);
}

function responseCode(value: UnknownRecord): string | undefined {
	if (typeof value.code === 'string') return value.code;
	if (typeof value.code === 'number' && Number.isFinite(value.code)) return String(value.code);
	return undefined;
}

function responseMessage(value: UnknownRecord): string {
	return typeof value.msg === 'string' && value.msg.length > 0 ? value.msg : 'BloFin REST request failed';
}

async function parseResponse<T>(
	response: Response,
	credentials: BlofinCredentials,
	options: { requireOk: boolean }
): Promise<BlofinRestResponse<T>> {
	let parsed: unknown;
	try {
		parsed = await response.json();
	} catch {
		throw classifiedError(
			options.requireOk ? 'BloFin REST response was not valid JSON' : `BloFin REST HTTP error ${response.status}`,
			credentials,
			{ status: response.status }
		);
	}
	if (!isRecord(parsed)) {
		throw classifiedError('BloFin REST response shape was invalid', credentials, { status: response.status });
	}

	const code = responseCode(parsed);
	const msg = responseMessage(parsed);
	if (options.requireOk && code !== '0') {
		throw classifiedError(msg, credentials, { blofinCode: code, status: response.status });
	}
	if (!options.requireOk) {
		throw classifiedError(msg, credentials, { blofinCode: code, status: response.status });
	}
	if (!code || typeof parsed.msg !== 'string' || !Object.prototype.hasOwnProperty.call(parsed, 'data')) {
		throw classifiedError('BloFin REST response shape was invalid', credentials, { status: response.status });
	}
	return { code, msg: parsed.msg, data: parsed.data as T };
}

function validateCredentials(credentials: BlofinCredentials): void {
	if (
		!isRecord(credentials) ||
		typeof credentials.apiKey !== 'string' ||
		typeof credentials.secret !== 'string' ||
		typeof credentials.passphrase !== 'string'
	) {
		throw new Error('BloFin credentials are invalid');
	}
}

async function executeRequest<T>(
	input: {
		baseUrl: string;
		method: BlofinHttpMethod;
		requestPath: string;
		serializedBody: string;
		signal?: AbortSignal;
	},
	credentials: BlofinCredentials
): Promise<BlofinRestResponse<T>> {
	validateCredentials(credentials);
	let attempt = 0;

	while (true) {
		if (input.signal?.aborted) throw classifiedError('BloFin REST request was aborted', credentials);
		const timestamp = createTimestamp();
		const nonce = createNonce();
		let signature: string;
		try {
			signature = await signBlofinRest(
				credentials.secret,
				input.requestPath,
				input.method,
				timestamp,
				nonce,
				input.serializedBody
			);
		} catch {
			throw classifiedError('BloFin REST signing failed', credentials);
		}

		const headers = new Headers({
			'ACCESS-KEY': credentials.apiKey,
			'ACCESS-SIGN': signature,
			'ACCESS-TIMESTAMP': timestamp,
			'ACCESS-NONCE': nonce,
			'ACCESS-PASSPHRASE': credentials.passphrase
		});
		if (input.serializedBody.length > 0) headers.set('content-type', 'application/json');

		const timeout = timeoutSignal();
		const signal = combinedSignal(input.signal, timeout);
		try {
			const response = await fetch(`${input.baseUrl}${input.requestPath}`, {
				method: input.method,
				headers,
				body: input.method === 'GET' || input.serializedBody.length === 0 ? undefined : input.serializedBody,
				signal
			});
			if (!responseIsOk(response)) {
				if (input.method === 'GET' && attempt === 0 && retryableStatus(response.status)) {
					attempt += 1;
					continue;
				}
				return await parseResponse<T>(response, credentials, { requireOk: false });
			}
			return await parseResponse<T>(response, credentials, { requireOk: true });
		} catch (error) {
			if (error instanceof BlofinRestError) throw error;
			if (input.signal?.aborted) throw classifiedError('BloFin REST request was aborted', credentials);
			if (input.method === 'GET' && attempt === 0) {
				attempt += 1;
				continue;
			}
			throw classifiedError('BloFin REST network request failed', credentials);
		}
	}
}

export async function blofinRestRequest<T>(
	input: BlofinRestRequest
): Promise<BlofinRestResponse<T>> {
	assertEnvironment(input?.environment);
	const method = normalizeMethod(input?.method);
	const environment = BLOFIN_ENVIRONMENTS[input.environment];
	assertRequestPath(input?.requestPath, environment.rest);
	if (typeof input?.credentials !== 'function') throw new Error('BloFin credential callback is required');
	const serializedBody = serializeBody(input.body);

	try {
		return await input.credentials((credentials) =>
			executeRequest<T>(
				{
					baseUrl: environment.rest,
					method,
					requestPath: input.requestPath,
					serializedBody,
					signal: input.signal
				},
				credentials
			)
		);
	} catch (error) {
		if (error instanceof BlofinRestError) throw error;
		throw classifiedError('BloFin REST request failed');
	}
}
