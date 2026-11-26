import { CAMPUSES, campusApiRoot, type CampusId } from '#lib/campus';
import { canEncodeCode39 } from '#lib/code39';
import { extractSeatSummaries } from '#lib/seats';
import { formatPyxisOperatingHours } from '#lib/date';
import type { CurrentSeatDto, RoomDetailDto, RoomDto, SeatDetailDto, SeatSummary } from '#lib/types';
import { USE_MOCK_API } from './config';
import { ApiError } from './errors';
import { requestPyxis } from './http';
import { mockLibrary } from './mock';

/** 클라이언트에 필요한 값만 남긴 도서관 API. 모든 메서드는 서버에서만 호출됩니다. */
export interface Library {
	getSeatRooms(campus: CampusId): Promise<RoomDto[]>;
	getSeatRoom(campus: CampusId, roomId: number): Promise<RoomDetailDto>;
	getSeats(campus: CampusId, roomId: number): Promise<SeatSummary[]>;
	getSeat(campus: CampusId, roomId: number, seatId: number): Promise<SeatDetailDto>;
	chargeSeat(seatId: number): Promise<void>;
	getCurrentSeat(): Promise<CurrentSeatDto | null>;
	getEntryPass(): Promise<string>;
	cancelReservation(seatChargeId: number): Promise<void>;
	discharge(seatChargeId: number): Promise<void>;
}

// --- 도서관 응답 형태(필요한 필드만) ---
interface RawRoom {
	id: number;
	name: string;
	floor: number;
	isChargeable: boolean;
	unableMessage: string | null;
	branch: { alias: string };
	seats: { total: number; available: number };
}
interface RawRoomDetail {
	name: string;
	attention: string | null;
	reservableDates: { beginTime: string; endTime: string }[] | null;
}
interface RawSeatDetail {
	id: number;
	code: string;
	isOccupied: boolean;
	seatType: { name: string };
	seatChargeableHour: { defaultUseTime: number };
}
interface RawCharge {
	id: number;
	room: { name: string };
	seat: { code: string };
	state: { name: string };
	beginTime: string;
	endTime: string;
	isCheckinable: boolean;
	checkinExpiryDate: string | null;
	arrivalConfirmMethods: string[];
	isReturnable: boolean;
	isRenewable: boolean;
	renewableDate: string | null;
	isGateOut: boolean;
}

function roomQuery(campus: CampusId): string {
	return `smufMethodCode=PC&roomTypeId=2&branchGroupId=${CAMPUSES[campus].branchGroupId}`;
}

function realLibrary(token: string): Library {
	return {
		async getSeatRooms(campus) {
			const res = await requestPyxis<{ list: RawRoom[] }>(`${campusApiRoot(campus)}/seat-rooms?${roomQuery(campus)}`, token);
			return (res.data?.list ?? []).map((r) => ({
				id: r.id,
				name: r.name,
				floor: r.floor,
				isChargeable: r.isChargeable,
				unableMessage: r.unableMessage,
				branchAlias: r.branch.alias,
				available: r.seats.available,
				total: r.seats.total
			}));
		},

		async getSeatRoom(campus, roomId) {
			const res = await requestPyxis<RawRoomDetail>(`${campusApiRoot(campus)}/api/seat-rooms/${roomId}?smufMethodCode=PC`, token);
			if (!res.data) throw new ApiError({ kind: 'malformed', message: '열람실 상세 정보가 없습니다.' });
			const date = res.data.reservableDates?.[0];
			return {
				name: res.data.name,
				attention: res.data.attention,
				period: date ? (formatPyxisOperatingHours(date.beginTime, date.endTime) ?? null) : null
			};
		},

		async getSeats(campus, roomId) {
			const res = await requestPyxis<unknown>(`${campusApiRoot(campus)}/api/rooms/${roomId}/seats`, token);
			return extractSeatSummaries(res.data);
		},

		async getSeat(campus, roomId, seatId) {
			const res = await requestPyxis<RawSeatDetail>(`${campusApiRoot(campus)}/api/rooms/${roomId}/seats/${seatId}`, token);
			if (!res.data) throw new ApiError({ kind: 'malformed', message: '좌석 상세 정보가 없습니다.' });
			return {
				id: res.data.id,
				code: res.data.code,
				isOccupied: res.data.isOccupied,
				seatTypeName: res.data.seatType.name,
				defaultUseTime: res.data.seatChargeableHour.defaultUseTime
			};
		},

		async chargeSeat(seatId) {
			// v2 는 관찰된 좌석 배정 endpoint 이므로 그대로 유지합니다.
			await requestPyxis<unknown>('/pyxis-api/2/api/seat-charges', token, {
				method: 'POST',
				body: { seatId, smufMethodCode: 'PC' }
			});
		},

		async getCurrentSeat() {
			const res = await requestPyxis<{ list: RawCharge[] }>('/pyxis-api/1/api/seat-charges', token);
			const c = res.data?.list?.[0];
			if (!c) return null;
			return {
				id: c.id,
				roomName: c.room.name,
				seatCode: c.seat.code,
				stateName: c.state.name,
				beginTime: c.beginTime,
				endTime: c.endTime,
				isCheckinable: c.isCheckinable,
				checkinExpiryDate: c.checkinExpiryDate,
				arrivalConfirmMethods: c.arrivalConfirmMethods ?? [],
				isReturnable: c.isReturnable,
				isRenewable: c.isRenewable,
				renewableDate: c.renewableDate,
				isGateOut: c.isGateOut
			};
		},

		async getEntryPass() {
			const res = await requestPyxis<{ printMemberNo?: unknown }>(`${campusApiRoot('science')}/api/my-info/edit`, token);
			const memberNo = typeof res.data?.printMemberNo === 'string' ? res.data.printMemberNo.trim() : '';
			if (memberNo.includes('*')) {
				throw new ApiError({ kind: 'unsupported', message: '학교에서 출입 바코드 번호를 가린 상태로 보내 이 화면에서 표시할 수 없습니다.' });
			}
			if (!canEncodeCode39(memberNo)) {
				throw new ApiError({ kind: 'malformed', message: '도서관에서 유효한 출입 바코드 정보를 받지 못했습니다.' });
			}
			return memberNo;
		},

		async cancelReservation(seatChargeId) {
			await requestPyxis<unknown>(`/pyxis-api/1/api/seat-charges/${seatChargeId}?smufMethodCode=PC&_method=delete`, token, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json;charset=UTF-8' }
			});
		},

		async discharge(seatChargeId) {
			await requestPyxis<unknown>('/pyxis-api/1/api/seat-discharges', token, {
				method: 'POST',
				body: { seatCharge: seatChargeId, smufMethodCode: 'PC' }
			});
		}
	};
}

export function getLibrary(token: string): Library {
	return USE_MOCK_API ? mockLibrary : realLibrary(token);
}
