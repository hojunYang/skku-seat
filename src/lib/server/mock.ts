import type { CampusId } from '#lib/campus';
import type { CurrentSeatDto, RoomDetailDto, RoomDto, SeatDetailDto, SeatSummary } from '#lib/types';
import { ApiError } from './errors';
import type { Library } from './library';

const rooms: Record<CampusId, RoomDto[]> = {
	humanities: [
		{ id: 33, name: '제1열람실-2', floor: 1, isChargeable: true, unableMessage: null, branchAlias: '중앙', available: 27, total: 30 },
		{ id: 38, name: '킹고존', floor: 3, isChargeable: false, unableMessage: '사용할 수 없는 기간입니다.', branchAlias: '중앙', available: 52, total: 52 }
	],
	science: [
		// 실제 서버처럼 층 순서가 섞여 있고, 구역 이름 뒤에 "(노트북)" 같은 설명이 붙는 경우를 흉내 냅니다.
		{ id: 9, name: '[3F] 열람실 1', floor: 3, isChargeable: true, unableMessage: null, branchAlias: '삼성', available: 12, total: 20 },
		{ id: 10, name: '[3F] 열람실 2', floor: 3, isChargeable: true, unableMessage: null, branchAlias: '삼성', available: 7, total: 20 },
		{ id: 1, name: '[B1] A열람실 1', floor: -1, isChargeable: true, unableMessage: null, branchAlias: '삼성', available: 54, total: 60 },
		{ id: 2, name: '[B1] A열람실 2', floor: -1, isChargeable: true, unableMessage: null, branchAlias: '삼성', available: 32, total: 35 },
		{ id: 3, name: '[B1] A열람실 3 (노트북)', floor: -1, isChargeable: true, unableMessage: null, branchAlias: '삼성', available: 5, total: 8 },
		{ id: 5, name: '[B1] B열람실 1 (노트북)', floor: -1, isChargeable: true, unableMessage: null, branchAlias: '삼성', available: 19, total: 24 },
		{ id: 6, name: '[B1] B열람실 2', floor: -1, isChargeable: true, unableMessage: null, branchAlias: '삼성', available: 30, total: 40 },
		{ id: 7, name: '[2F] G열람실 1', floor: 2, isChargeable: true, unableMessage: null, branchAlias: '삼성', available: 15, total: 30 },
		{ id: 8, name: '[2F] G열람실 2', floor: 2, isChargeable: true, unableMessage: null, branchAlias: '삼성', available: 8, total: 30 },
		{ id: 4, name: '[B1] 노트북실', floor: -1, isChargeable: true, unableMessage: null, branchAlias: '삼성', available: 9, total: 10 }
	]
};

const ALL_ROOM_IDS = Object.values(rooms).flatMap((list) => list.map((r) => r.id));

// 좌석 상세: 3의 배수 번호는 사용 중
function seatsOf(roomId: number): SeatDetailDto[] {
	const count = Object.values(rooms).flat().find((r) => r.id === roomId)?.total ?? 0;
	return Array.from({ length: count }, (_, i) => ({
		id: roomId * 1000 + i + 1,
		code: String(i + 1),
		isOccupied: (i + 1) % 10 === 0 || (roomId === 3 && i % 3 === 0),
		seatTypeName: '일반',
		defaultUseTime: 240
	}));
}

let current: CurrentSeatDto | null = null;

function fail(message: string): never {
	throw new ApiError({ kind: 'api', message });
}

export const mockLibrary: Library = {
	async getSeatRooms(campus) {
		return rooms[campus];
	},
	async getSeatRoom(campus, roomId): Promise<RoomDetailDto> {
		const room = rooms[campus].find((r) => r.id === roomId);
		if (!room) fail('Mock 열람실 정보를 찾을 수 없습니다.');
		return { name: room.name, attention: null, period: '23:00 ~ 익일 05:00' };
	},
	async getSeats(_campus, roomId): Promise<SeatSummary[]> {
		// 상태 없는 목록을 돌려줘서 좌석 상세 기반 점유 조회 흐름도 확인할 수 있게 합니다.
		return seatsOf(roomId).map(({ id, code }) => ({ id, code }));
	},
	async getSeat(_campus, roomId, seatId) {
		const seat = seatsOf(roomId).find((s) => s.id === seatId);
		if (!seat) fail('Mock 좌석을 찾을 수 없습니다.');
		return seat;
	},
	async chargeSeat(seatId) {
		const all = ALL_ROOM_IDS.flatMap(seatsOf);
		const seat = all.find((s) => s.id === seatId);
		if (!seat || seat.isOccupied || current) fail('해당 좌석은 다른 사용자가 먼저 배정받았습니다.');
		current = {
			id: 5744801,
			roomName: Math.floor(seatId / 1000) === 33 ? '제1열람실-2' : '[B1] A열람실',
			seatCode: seat.code,
			stateName: '임시배정',
			beginTime: '2026-09-09 23:55:00',
			endTime: '2026-09-10 03:55:00',
			isCheckinable: true,
			checkinExpiryDate: '2999-01-01 00:00:00',
			arrivalConfirmMethods: ['GATE'],
			isReturnable: false,
			isRenewable: false,
			renewableDate: null,
			isGateOut: false
		};
	},
	async getCurrentSeat() {
		return current;
	},
	async getEntryPass() {
		return 'DEMO';
	},
	async cancelReservation(id) {
		if (!current?.isCheckinable || current.id !== id) fail('취소할 수 있는 예약이 없습니다.');
		current = null;
	},
	async discharge(id) {
		if (!current || current.id !== id) fail('반납할 좌석이 없습니다.');
		current = null;
	}
};
