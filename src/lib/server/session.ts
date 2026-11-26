import { error, json, redirect, type Cookies } from '@sveltejs/kit';
import { loginUrl } from '#lib/login-redirect';
import { ApiError, isAuthError, toUserMessage } from './errors';

/**
 * 세션 = 도서관 access token 을 담은 httpOnly 쿠키 하나뿐입니다.
 * 서버는 DB/파일/메모리에 토큰이나 비밀번호를 보관하지 않으며(stateless), JS 에서는 읽을 수 없습니다.
 */
const SESSION_COOKIE = 'skku_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function readSession(cookies: Cookies): string | null {
	return cookies.get(SESSION_COOKIE) ?? null;
}

/** maxAgeSeconds 를 주면(토큰 만료 시각 기준) 기본 수명(7일)보다 짧을 때만 그 값을 사용합니다. */
export function setSession(cookies: Cookies, url: URL, accessToken: string, maxAgeSeconds?: number): void {
	const maxAge =
		maxAgeSeconds !== undefined && maxAgeSeconds > 0
			? Math.min(SESSION_MAX_AGE_SECONDS, Math.floor(maxAgeSeconds))
			: SESSION_MAX_AGE_SECONDS;
	cookies.set(SESSION_COOKIE, accessToken, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge
	});
}

export function clearSession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function requireToken(locals: App.Locals, url?: URL): string {
	if (!locals.token) redirect(303, url ? loginUrl(url) : '/login');
	return locals.token;
}

type Ctx = { cookies: Cookies; locals: App.Locals; url?: URL };

/** 페이지 load / form action 용. 인증 만료를 발견하면 쿠키를 지우고 로그인으로 보냅니다. */
export async function guarded<T>(ctx: Ctx, fn: (token: string) => Promise<T>): Promise<T> {
	const token = requireToken(ctx.locals, ctx.url);
	try {
		return await fn(token);
	} catch (e) {
		if (isAuthError(e)) {
			clearSession(ctx.cookies);
			ctx.locals.token = null;
			redirect(303, ctx.url ? loginUrl(ctx.url, { expired: true }) : '/login?expired=1');
		}
		throw e;
	}
}

/** load 에서 치명적이지 않은 오류를 메시지로 바꿀 때 사용. 인증 오류는 반드시 다시 던집니다. */
export function softError(e: unknown, fallback: string): string {
	if (isAuthError(e)) throw e;
	return toUserMessage(e, fallback);
}

/** JSON API 용. 오류를 상태 코드 + {message} 응답으로 바꿉니다. */
export async function apiGuarded(ctx: Ctx, fn: (token: string) => Promise<Response>): Promise<Response> {
	if (!ctx.locals.token) return json({ message: '로그인이 필요합니다.' }, { status: 401 });
	try {
		return await fn(ctx.locals.token);
	} catch (e) {
		if (isAuthError(e)) {
			clearSession(ctx.cookies);
			ctx.locals.token = null;
			return json({ message: toUserMessage(e, '') }, { status: 401 });
		}
		if (e instanceof ApiError) {
			return json({ message: toUserMessage(e, '요청을 처리하지 못했습니다.') }, { status: e.kind === 'api' ? 409 : 502 });
		}
		error(500, '요청을 처리하지 못했습니다.');
	}
}
