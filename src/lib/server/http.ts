import { REQUEST_TIMEOUT_MS, SKKU_LIBRARY_BASE_URL } from './config';
import { ApiError, GENERIC_HTTP_MESSAGE, type ApiErrorKind } from './errors';

export interface ApiResponse<T> {
	success: boolean;
	code: string;
	message: string;
	data?: T;
}

interface RequestOptions {
	method?: 'GET' | 'POST';
	body?: unknown;
	headers?: Record<string, string>;
}

export interface JsonResponse<T> {
	status: number;
	body: T;
	/** 로그를 남기지 마세요. 로그인 토큰이 들어 있을 수 있습니다. */
	setCookies: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function looksLikeAuthCode(code: string | undefined): boolean {
	return Boolean(code && /(auth|login|token|unauthori|expired)/i.test(code));
}

function errorKind(status: number, code?: string): ApiErrorKind {
	return status === 401 || status === 403 || looksLikeAuthCode(code) ? 'auth' : 'http';
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<JsonResponse<T>> {
	const { method = 'GET', body, headers } = options;
	let response: Response;

	try {
		response = await fetch(`${SKKU_LIBRARY_BASE_URL}${path}`, {
			method,
			headers: {
				Accept: 'application/json',
				'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
				Origin: SKKU_LIBRARY_BASE_URL,
				Referer: `${SKKU_LIBRARY_BASE_URL}/`,
				'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
				...headers
			},
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
			redirect: 'manual',
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		});
	} catch {
		throw new ApiError({ kind: 'network', message: '인터넷 연결을 확인해주세요.' });
	}

	let parsed: unknown;
	try {
		parsed = await response.json();
	} catch {
		// 401/403 등은 본문이 JSON 이 아닐 수 있으므로 상태 코드를 먼저 판단합니다.
		if (!response.ok) {
			throw new ApiError({
				kind: errorKind(response.status),
				status: response.status,
				message: GENERIC_HTTP_MESSAGE
			});
		}
		throw new ApiError({ kind: 'malformed', status: response.status, message: '서버 응답 형식을 확인할 수 없습니다.' });
	}

	if (!response.ok) {
		const code = isRecord(parsed) && typeof parsed.code === 'string' ? parsed.code : undefined;
		const message =
			isRecord(parsed) && typeof parsed.message === 'string' && parsed.message.trim()
				? parsed.message
				: GENERIC_HTTP_MESSAGE;
		throw new ApiError({ kind: errorKind(response.status, code), status: response.status, code, message });
	}

	return { status: response.status, body: parsed as T, setCookies: response.headers.getSetCookie() };
}

export function assertApiResponse<T>(value: unknown, status: number): ApiResponse<T> {
	if (
		!isRecord(value) ||
		typeof value.success !== 'boolean' ||
		typeof value.code !== 'string' ||
		typeof value.message !== 'string'
	) {
		throw new ApiError({ kind: 'malformed', status, message: '서버 응답 형식을 확인할 수 없습니다.' });
	}

	const response: ApiResponse<T> = { success: value.success, code: value.code, message: value.message };
	if ('data' in value) response.data = value.data as T;
	if (!response.success) {
		throw new ApiError({
			kind: looksLikeAuthCode(response.code) ? 'auth' : 'api',
			status,
			code: response.code,
			message: response.message || '요청을 처리하지 못했습니다.'
		});
	}
	return response;
}

export async function requestPyxis<T>(
	path: string,
	accessToken: string,
	options: RequestOptions = {}
): Promise<ApiResponse<T>> {
	const response = await requestJson<unknown>(path, {
		...options,
		headers: {
			'Pyxis-Auth-Token': accessToken,
			...(options.body === undefined ? {} : { 'Content-Type': 'application/json;charset=UTF-8' }),
			...options.headers
		}
	});
	return assertApiResponse<T>(response.body, response.status);
}
