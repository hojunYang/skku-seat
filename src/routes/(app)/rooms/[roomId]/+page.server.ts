import { error } from '@sveltejs/kit';
import { requireCampusInUrl } from '#lib/server/campus';
import { getLibrary } from '#lib/server/library';
import { guarded, softError } from '#lib/server/session';
import { findGroup } from '#lib/rooms';
import type { RoomDetailDto, RoomDto, RoomSection } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, params, url }) => {
	const roomId = Number(params.roomId);
	if (!Number.isInteger(roomId) || roomId <= 0) error(404, '열람실을 찾을 수 없습니다.');
	const campus = requireCampusInUrl(url, cookies);

	return guarded({ locals, cookies, url }, async (token) => {
		const library = getLibrary(token);

		// 열람실 목록으로 같은 묶음(예: [B1] A열람실 1·2·3)을 찾습니다. 실패하면 요청한 열람실 하나만 보여줍니다.
		let rooms: RoomDto[] = [];
		try {
			rooms = await library.getSeatRooms(campus);
		} catch (e) {
			softError(e, '');
		}
		const group = findGroup(rooms, roomId);
		if (rooms.length > 0 && !group) error(404, '열람실을 찾을 수 없습니다.');

		const members = group?.rooms ?? [{ id: roomId, name: '열람실', available: 0, total: 0, isChargeable: true }];
		const labels = group?.labels ?? [''];
		const notes = group?.notes ?? [''];

		const [detailResult, ...seatResults] = await Promise.allSettled([
			library.getSeatRoom(campus, members[0].id),
			...members.map((room) => library.getSeats(campus, room.id))
		]);

		let detail: RoomDetailDto | null = null;
		let detailError: string | null = null;
		if (detailResult.status === 'fulfilled') detail = detailResult.value;
		else detailError = softError(detailResult.reason, '열람실 정보를 불러오지 못했습니다.');

		const sections: RoomSection[] = members.map((room, i) => {
			const result = seatResults[i];
			const ok = result.status === 'fulfilled';
			return {
				roomId: room.id,
				label: labels[i],
				note: notes[i],
				name: room.name,
				available: room.available,
				total: room.total,
				isChargeable: room.isChargeable,
				seats: ok ? result.value : [],
				seatsError: ok ? null : softError(result.reason, '좌석 목록을 불러오지 못했습니다.')
			};
		});

		return {
			campus,
			roomId,
			title: group?.name ?? detail?.name ?? '열람실',
			floor: group?.floor ?? null,
			available: group?.available ?? null,
			total: group?.total ?? null,
			detail,
			detailError,
			sections
		};
	});
};
