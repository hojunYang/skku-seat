import { describe, expect, it } from 'vitest';
import { getFloorPlan } from './floorplans';
import type { RoomDto } from './types';

function room(id: number, name: string, floor: number, branchAlias: string): RoomDto {
	return { id, name, floor, branchAlias, available: 4, total: 10, isChargeable: true, unableMessage: null };
}

describe('getFloorPlan', () => {
	it('connects a zone to the current room ID and tolerates a changed note', () => {
		const mapped = room(606, '[B1] B열람실 2', -1, '삼성');
		const plan = getFloorPlan('science', -1, [mapped]);
		expect(plan?.image).toBe('/floorplans/B1.svg');
		expect(plan?.zones.find((zone) => zone.label?.text === 'B2')?.room).toBe(mapped);
	});

	it('links individual rooms inside the shared humanities zone', () => {
		const mapped = room(33, '제1열람실-2', 1, '중앙');
		const parts = getFloorPlan('humanities', 1, [mapped])?.zones[0].parts;
		expect(parts?.map((part) => part.room?.id)).toEqual([undefined, 33, undefined, undefined]);
	});

	it('skips other buildings and zones whose names match ambiguously', () => {
		expect(getFloorPlan('humanities', 1, [room(33, '제1열람실-2', 1, '경영')])).toBeNull();
		expect(getFloorPlan('science', -1, [
			room(6, '[B1] B열람실 2 (일반)', -1, '삼성'),
			room(7, '[B1] B열람실 2 (컴퓨터)', -1, '삼성')
		])).toBeNull();
	});
});
