import { fail, redirect } from '@sveltejs/kit';
import { sanitizeNext } from '#lib/login-redirect';
import { USE_MOCK_API } from '#lib/server/config';
import { loginAtLibrary } from '#lib/server/auth';
import { ApiError, GENERIC_HTTP_MESSAGE, isAuthError, toUserMessage } from '#lib/server/errors';
import { checkLoginRate, recordLoginFailure, resetLoginRate } from '#lib/server/rate-limit';
import { setSession } from '#lib/server/session';
import { tokenExpiryMs } from '#lib/server/token';
import type { Actions, PageServerLoad } from './$types';

/** 학교 서버가 구체적인 사유(예: 계정 잠금)를 주면 그대로 보여주고, 아니면 일반 문구를 사용합니다. */
function loginErrorMessage(e: unknown): string {
	if (e instanceof ApiError && e.kind === 'auth') {
		return e.message && e.message !== GENERIC_HTTP_MESSAGE ? e.message : '아이디 또는 비밀번호를 확인해주세요.';
	}
	return toUserMessage(e, '로그인에 실패했습니다.');
}

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.token) redirect(303, sanitizeNext(url.searchParams.get('next')));
	return { mock: USE_MOCK_API, expired: url.searchParams.get('expired') === '1' };
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress, locals }) => {
		const form = await request.formData();
		const loginId = String(form.get('loginId') ?? '').trim();
		const password = String(form.get('password') ?? '');

		// 주의: 비밀번호는 어떤 경우에도 fail() 데이터로 되돌려 보내지 않습니다.
		if (!loginId) return fail(400, { loginId, message: '아이디를 입력해주세요.' });
		if (!password) return fail(400, { loginId, message: '비밀번호를 입력해주세요.' });
		if (loginId.length > 100 || password.length > 200) {
			return fail(400, { loginId: loginId.slice(0, 100), message: '입력값이 너무 깁니다.' });
		}

		const rateKey = getClientAddress();
		const waitMinutes = checkLoginRate(rateKey);
		if (waitMinutes !== null) {
			return fail(429, { loginId, message: `로그인 시도가 너무 많습니다. ${waitMinutes}분 뒤에 다시 시도해주세요.` });
		}

		let accessToken: string;
		try {
			accessToken = USE_MOCK_API ? 'mock' : await loginAtLibrary(loginId, password);
		} catch (e) {
			// 네트워크 장애는 사용자 잘못이 아니므로 시도 횟수에 포함하지 않습니다.
			if (isAuthError(e)) recordLoginFailure(rateKey);
			return fail(isAuthError(e) ? 401 : 502, { loginId, message: loginErrorMessage(e) });
		}

		resetLoginRate(rateKey);
		const expiresAt = tokenExpiryMs(accessToken);
		setSession(cookies, url, accessToken, expiresAt === undefined ? undefined : (expiresAt - Date.now()) / 1000);
		locals.token = accessToken;
		// 만료 전에 보고 있던 위치(campus 포함)로 돌아갑니다.
		redirect(303, sanitizeNext(url.searchParams.get('next')));
	}
};
