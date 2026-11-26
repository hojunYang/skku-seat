import { json, redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { loginUrl } from '#lib/login-redirect';
import { readSession } from '#lib/server/session';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PUBLIC_PATHS = new Set(['/login']);

/**
 * 브라우저가 보내는 Sec-Fetch-Site 를 우선 신뢰하고(위조 불가 헤더), 없으면 Origin 을 비교합니다.
 * 둘 다 없는 요청(curl 등 비브라우저)은 CSRF 위험이 없으므로 허용합니다.
 */
function isSameOriginRequest(request: Request, url: URL): boolean {
	const site = request.headers.get('sec-fetch-site');
	if (site) return site === 'same-origin' || site === 'none';
	const origin = request.headers.get('origin');
	return !origin || origin === url.origin;
}

export const handle: Handle = async ({ event, resolve }) => {
	const { request, url } = event;

	// CSRF: 상태를 바꾸는 요청은 같은 origin 에서 온 것만 허용합니다(form 과 fetch 모두).
	if (!SAFE_METHODS.has(request.method) && !isSameOriginRequest(request, url)) {
		return json({ message: '허용되지 않은 요청입니다.' }, { status: 403 });
	}

	event.locals.token = readSession(event.cookies);

	// 로그인 없이 접근 가능한 경로 외에는 세션이 필요합니다.
	if (!event.locals.token && !PUBLIC_PATHS.has(url.pathname) && !url.pathname.startsWith('/logout')) {
		if (url.pathname.startsWith('/api/')) return json({ message: '로그인이 필요합니다.' }, { status: 401 });
		redirect(303, loginUrl(url));
	}

	const response = await resolve(event);

	// 개인 좌석 데이터가 공유 캐시나 뒤로가기 캐시에 남지 않게 합니다.
	response.headers.set('Cache-Control', 'no-store');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'same-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	return response;
};
