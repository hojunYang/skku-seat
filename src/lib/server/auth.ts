import { SKKU_LIBRARY_BASE_URL } from './config';
import { ApiError } from './errors';
import { requestJson } from './http';
import { tokenFromResponseJson, tokenFromSetCookies } from './token';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * 학술정보관에 로그인하고 access token 을 반환합니다.
 * 비밀번호는 이 요청 body 에만 사용되며 저장·로그·반환하지 않습니다.
 */
export async function loginAtLibrary(loginId: string, password: string): Promise<string> {
	const response = await requestJson<unknown>('/api/auth/login', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Origin: SKKU_LIBRARY_BASE_URL,
			Referer: `${SKKU_LIBRARY_BASE_URL}/`
		},
		body: {
			loginId,
			password,
			isFamilyLogin: false,
			// 서버 의미가 확인될 때까지 웹에서 확인된 값을 유지합니다.
			isMobile: false
		}
	});

	if (!isRecord(response.body)) {
		throw new ApiError({ kind: 'malformed', status: response.status, message: '로그인 응답을 확인할 수 없습니다.' });
	}
	if (response.body.success === false) {
		throw new ApiError({
			kind: 'auth',
			status: response.status,
			code: typeof response.body.code === 'string' ? response.body.code : undefined,
			message: typeof response.body.message === 'string' ? response.body.message : '로그인에 실패했습니다.'
		});
	}

	const accessToken = tokenFromResponseJson(response.body) ?? tokenFromSetCookies(response.setCookies);
	if (!accessToken) {
		throw new ApiError({ kind: 'malformed', status: response.status, message: '로그인 토큰을 확인할 수 없습니다.' });
	}
	return accessToken;
}
