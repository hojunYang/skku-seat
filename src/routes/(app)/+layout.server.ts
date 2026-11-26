import { error } from '@sveltejs/kit';
import { resolveCampus } from '#lib/server/campus';
import { getLibrary } from '#lib/server/library';
import { ApiError, toUserMessage } from '#lib/server/errors';
import { guarded } from '#lib/server/session';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies, depends, url }) => {
	depends('app:charges');
	const campus = resolveCampus(url, cookies);
	try {
		// 가볍게 인증된 endpoint 를 호출해 세션 유효성을 검증하면서 현재 좌석도 함께 가져옵니다.
		const currentSeat = await guarded({ locals, cookies, url }, (token) => getLibrary(token).getCurrentSeat());
		return { currentSeat, campus };
	} catch (e) {
		// 오프라인/서버 장애: 유효한 로컬 세션은 유지하고 재시도 화면을 보여줍니다.
		if (e instanceof ApiError) error(503, toUserMessage(e, '로그인 상태를 확인하지 못했습니다.'));
		throw e;
	}
};
