import { requireCampusInUrl } from '#lib/server/campus';
import { getLibrary } from '#lib/server/library';
import { guarded, softError } from '#lib/server/session';
import type { RoomDto } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const campus = requireCampusInUrl(url, cookies);
	let rooms: RoomDto[] = [];
	let roomsError = null as string | null;
	await guarded({ locals, cookies, url }, async (token) => {
		try {
			rooms = await getLibrary(token).getSeatRooms(campus);
		} catch (e) {
			roomsError = softError(e, '열람실 정보를 불러오지 못했습니다.');
		}
	});
	return { campus, rooms, roomsError };
};
