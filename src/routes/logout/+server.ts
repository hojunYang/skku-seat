import { redirect } from '@sveltejs/kit';
import { clearSession } from '#lib/server/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	// 학술정보관 서버의 로그아웃은 호출하지 않고 이 앱의 세션 쿠키만 지웁니다.
	// 서버 로그아웃이 좌석 상태에 영향을 줄 수 있어, 로그아웃해도 좌석은 그대로 유지됩니다.
	clearSession(cookies);
	locals.token = null;
	redirect(303, '/login');
};
