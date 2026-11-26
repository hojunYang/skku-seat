import { fail } from '@sveltejs/kit';
import { getLibrary } from '#lib/server/library';
import { ApiError, toUserMessage } from '#lib/server/errors';
import { guarded } from '#lib/server/session';
import type { Actions } from './$types';

async function run(
	event: Parameters<NonNullable<Actions[string]>>[0],
	action: 'cancel' | 'discharge'
) {
	const id = Number((await event.request.formData()).get('id'));
	if (!Number.isInteger(id) || id <= 0) return fail(400, { message: '잘못된 요청입니다.' });
	try {
		await guarded(event, (token) => {
			const library = getLibrary(token);
			return action === 'cancel' ? library.cancelReservation(id) : library.discharge(id);
		});
	} catch (e) {
		// redirect(인증 만료)는 그대로 전파하고, 나머지는 메시지로 변환합니다.
		if (e instanceof ApiError) {
			return fail(409, {
				message: toUserMessage(e, action === 'cancel' ? '예약을 취소하지 못했습니다.' : '좌석을 반납하지 못했습니다.')
			});
		}
		throw e;
	}
	return { ok: true };
}

export const actions: Actions = {
	cancel: (event) => run(event, 'cancel'),
	discharge: (event) => run(event, 'discharge')
};
