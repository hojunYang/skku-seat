import { describe, expect, it } from 'vitest';
import { findGroup, floorLabel, groupRooms } from './rooms';
import type { RoomDto } from './types';

function room(id: number, name: string, available: number, total: number, extra: Partial<RoomDto> = {}): RoomDto {
	return { id, name, floor: -1, isChargeable: true, unableMessage: null, branchAlias: '삼성', available, total, ...extra };
}

describe('groupRooms', () => {
	const rooms = [
		room(3, '[B1] A열람실 3 (노트북)', 5, 24),
		room(1, '[B1] A열람실 1', 77, 210),
		room(2, '[B1] A열람실 2', 32, 78),
		room(9, '킹고존', 10, 20, { floor: 3 })
	];

	it('같은 이름에 번호만 다른 열람실을 번호 순으로 묶고 합계를 계산', () => {
		const [group, single] = groupRooms(rooms);
		expect(group.name).toBe('[B1] A열람실');
		expect(group.id).toBe(1);
		expect(group.rooms.map((r) => r.id)).toEqual([1, 2, 3]);
		expect(group.labels).toEqual(['1', '2', '3']);
		expect(group.available).toBe(114);
		expect(group.total).toBe(312);
		expect(single.name).toBe('킹고존');
		expect(single.rooms).toHaveLength(1);
	});

	it('이름 뒤 괄호 설명(노트북)이 있어도 같은 묶음이고 설명은 따로 보관', () => {
		const [group] = groupRooms([room(1, '[B1] B열람실 1 (노트북)', 1, 2), room(2, '[B1] B열람실 2', 1, 2)]);
		expect(group.name).toBe('[B1] B열람실');
		expect(group.labels).toEqual(['1', '2']);
		expect(group.notes).toEqual(['노트북', '']);
	});

	it('3층 열람실은 번호가 있어도 묶지 않음', () => {
		const groups = groupRooms([
			room(1, '[3F] 열람실 1', 1, 2, { floor: 3 }),
			room(2, '[3F] 열람실 2', 1, 2, { floor: 3 })
		]);
		expect(groups.map((g) => g.name)).toEqual(['[3F] 열람실 1', '[3F] 열람실 2']);
	});

	it('지하부터 위층 순으로 정렬하고 같은 층에서는 서버 순서를 유지', () => {
		const groups = groupRooms([
			room(1, '다', 1, 2, { floor: 4 }),
			room(2, '나', 1, 2, { floor: -1 }),
			room(3, '가', 1, 2, { floor: 2 }),
			room(4, '라', 1, 2, { floor: -1 })
		]);
		expect(groups.map((g) => g.name)).toEqual(['나', '라', '가', '다']);
	});

	it('혼자인 번호형 이름은 묶지 않고 원래 이름 유지', () => {
		const [only] = groupRooms([room(1, '[B1] A열람실 1', 1, 2)]);
		expect(only.name).toBe('[B1] A열람실 1');
		expect(only.labels).toEqual(['']);
	});

	it('다른 층이나 다른 건물이면 묶지 않음', () => {
		const groups = groupRooms([room(1, 'A열람실 1', 1, 2), room(2, 'A열람실 2', 1, 2, { floor: 2 })]);
		expect(groups).toHaveLength(2);
	});

	it('하나라도 이용 가능하면 묶음은 이용 가능, 전부 불가면 사유 표시', () => {
		const some = groupRooms([room(1, 'A 1', 1, 2), room(2, 'A 2', 1, 2, { isChargeable: false })])[0];
		expect(some.isChargeable).toBe(true);
		const none = groupRooms([
			room(1, 'A 1', 1, 2, { isChargeable: false, unableMessage: '점검 중' }),
			room(2, 'A 2', 1, 2, { isChargeable: false })
		])[0];
		expect(none.isChargeable).toBe(false);
		expect(none.unableMessage).toBe('점검 중');
	});

	it('묶음의 아무 열람실 id 로도 같은 묶음을 찾음', () => {
		expect(findGroup(rooms, 2)?.id).toBe(1);
		expect(findGroup(rooms, 999)).toBeUndefined();
	});
});

describe('floorLabel', () => {
	it('지하는 "지하 N층"으로 표시', () => {
		expect(floorLabel(-1)).toBe('지하 1층');
		expect(floorLabel(3)).toBe('3층');
	});
});
