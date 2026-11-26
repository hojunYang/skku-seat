import { requireCampusInUrl } from '#lib/server/campus';
import { USE_MOCK_API } from '#lib/server/config';
import { getLibrary } from '#lib/server/library';
import { guarded, softError } from '#lib/server/session';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const campus = requireCampusInUrl(url, cookies);
	return guarded({ locals, cookies, url }, async (token) => {
		try {
			return { campus, mock: USE_MOCK_API, memberNo: await getLibrary(token).getEntryPass(), message: null };
		} catch (error) {
			return { campus, mock: USE_MOCK_API, memberNo: null, message: softError(error, '출입 바코드를 불러오지 못했습니다.') };
		}
	});
};
