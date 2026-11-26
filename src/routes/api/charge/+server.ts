import { json } from '@sveltejs/kit';
import { getLibrary } from '#lib/server/library';
import { apiGuarded } from '#lib/server/session';
import type { RequestHandler } from './$types';

/** 사용자가 좌석 상세를 확인하고 버튼을 눌렀을 때만 호출되는 명시적 좌석 배정. */
export const POST: RequestHandler = (event) =>
	apiGuarded(event, async (token) => {
		const body: unknown = await event.request.json().catch(() => null);
		const seatId = typeof body === 'object' && body !== null ? (body as { seatId?: unknown }).seatId : undefined;
		if (typeof seatId !== 'number' || !Number.isInteger(seatId) || seatId <= 0) {
			return json({ message: '잘못된 요청입니다.' }, { status: 400 });
		}
		await getLibrary(token).chargeSeat(seatId);
		return json({ ok: true });
	});
