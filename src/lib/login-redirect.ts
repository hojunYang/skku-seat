import { isCampusId } from '#lib/campus';

const FALLBACK = '/';
const BLOCKED_PREFIXES = ['/login', '/logout', '/api'];

/**
 * 로그인 후 돌아올 경로를 안전하게 정리합니다.
 * 같은 사이트 안의 경로만 허용하고, 쿼리는 campus 만 유지합니다(open redirect 와 `?/action` 같은 잔여 쿼리 방지).
 */
export function sanitizeNext(raw: string | null | undefined): string {
	if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return FALLBACK;
	let parsed: URL;
	try {
		parsed = new URL(raw, 'http://localhost');
	} catch {
		return FALLBACK;
	}
	if (parsed.origin !== 'http://localhost') return FALLBACK;
	if (BLOCKED_PREFIXES.some((p) => parsed.pathname === p || parsed.pathname.startsWith(`${p}/`))) return FALLBACK;
	const campus = parsed.searchParams.get('campus');
	return parsed.pathname + (isCampusId(campus) ? `?campus=${campus}` : '');
}

/** 현재 보고 있던 위치(경로 + campus)를 담아 로그인 화면으로 보내는 URL 을 만듭니다. */
export function loginUrl(from: URL, options: { expired?: boolean } = {}): string {
	const params = new URLSearchParams();
	if (options.expired) params.set('expired', '1');
	const next = sanitizeNext(from.pathname + from.search);
	if (next !== FALLBACK) params.set('next', next);
	const query = params.toString();
	return query ? `/login?${query}` : '/login';
}
