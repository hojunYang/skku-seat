/** 서버가 의미 있는 메시지를 주지 않았을 때 쓰는 기본 문구 */
export const GENERIC_HTTP_MESSAGE = '서버 요청을 처리하지 못했습니다.';

export type ApiErrorKind = 'network' | 'http' | 'api' | 'auth' | 'malformed' | 'unsupported';

export class ApiError extends Error {
	readonly kind: ApiErrorKind;
	readonly status?: number;
	readonly code?: string;

	constructor(options: { kind: ApiErrorKind; message: string; status?: number; code?: string }) {
		super(options.message);
		this.name = 'ApiError';
		this.kind = options.kind;
		this.status = options.status;
		this.code = options.code;
	}
}

export function isAuthError(error: unknown): boolean {
	return error instanceof ApiError && error.kind === 'auth';
}

export function toUserMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiError) {
		if (error.kind === 'network') return '학술정보관 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.';
		if (error.kind === 'auth') return '로그인이 만료되었습니다. 다시 로그인해주세요.';
		return error.message || fallback;
	}
	return fallback;
}
