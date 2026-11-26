import { json } from '@sveltejs/kit';
import { parseCampus } from '#lib/campus';
import { getLibrary } from '#lib/server/library';
import { apiGuarded } from '#lib/server/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) =>
	apiGuarded(event, async (token) => {
		const roomId = Number(event.params.roomId);
		const seatId = Number(event.params.seatId);
		if (!Number.isInteger(roomId) || !Number.isInteger(seatId)) return json({ message: '잘못된 요청입니다.' }, { status: 400 });
		const campus = parseCampus(event.url.searchParams.get('campus'));
		return json(await getLibrary(token).getSeat(campus, roomId, seatId));
	});
