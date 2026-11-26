import { redirect, type Cookies } from '@sveltejs/kit';
import { DEFAULT_CAMPUS, isCampusId, type CampusId } from '#lib/campus';

/**
 * 마지막으로 선택한 캠퍼스를 기억하는 쿠키입니다. 로그인 만료·로그아웃·URL 에 campus 가 없는 이동에서도
 * 캠퍼스가 유지되도록 하는 보조 수단이며, 로그아웃해도 지우지 않습니다.
 */
const CAMPUS_COOKIE = 'skku_campus';
const CAMPUS_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** URL 의 campus 를 우선하고(쿠키에 기억), 없으면 쿠키, 그것도 없으면 기본값을 사용합니다. */
export function resolveCampus(url: URL, cookies: Cookies): CampusId {
	const param = url.searchParams.get('campus');
	if (isCampusId(param)) {
		if (cookies.get(CAMPUS_COOKIE) !== param) {
			cookies.set(CAMPUS_COOKIE, param, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: url.protocol === 'https:',
				maxAge: CAMPUS_MAX_AGE_SECONDS
			});
		}
		return param;
	}
	const saved = cookies.get(CAMPUS_COOKIE);
	return isCampusId(saved) ? saved : DEFAULT_CAMPUS;
}

/** resolveCampus 와 같지만, URL 에 campus 가 없거나 잘못됐으면 올바른 campus 를 붙여 같은 경로로 이동시킵니다. */
export function requireCampusInUrl(url: URL, cookies: Cookies): CampusId {
	const campus = resolveCampus(url, cookies);
	if (url.searchParams.get('campus') !== campus) {
		const target = new URL(url);
		target.searchParams.set('campus', campus);
		redirect(303, target.pathname + target.search);
	}
	return campus;
}
