import type { RoomDto } from './types';

/**
 * "[B1] A열람실 1", "[B1] A열람실 3 (노트북)" 처럼 '공백 + 숫자'로 끝나고,
 * 뒤에 괄호 설명이 붙을 수도 있는 이름. 1: 공통 이름, 2: 구역 번호, 3: 괄호 설명
 */
const NUMBERED_NAME = /^(.+?)\s+(\d+)(?:\s*\(([^)]*)\))?$/;

/** 이 층의 열람실은 번호가 있어도 서로 다른 공간이라 묶지 않습니다. */
const UNGROUPED_FLOORS: ReadonlySet<number> = new Set([3]);

export interface RoomGroup {
	/** 대표 열람실 id (구역 번호가 가장 작은 열람실). 링크에 사용 */
	id: number;
	/** 묶인 경우 번호를 뺀 이름(예: "[B1] A열람실"), 단독이면 원래 이름 */
	name: string;
	floor: number;
	branchAlias: string;
	/** 구역 번호 순으로 정렬된 열람실들. 단독 열람실이면 1개 */
	rooms: RoomDto[];
	/** 각 열람실의 구역 번호(단독이면 빈 문자열). rooms 와 같은 순서 */
	labels: string[];
	/** 각 열람실 이름 뒤 괄호 설명(예: "노트북", 없으면 빈 문자열). rooms 와 같은 순서 */
	notes: string[];
	available: number;
	total: number;
	isChargeable: boolean;
	unableMessage: string | null;
}

/** -1 → "지하 1층", 3 → "3층" */
export function floorLabel(floor: number): string {
	return floor < 0 ? `지하 ${-floor}층` : `${floor}층`;
}

/**
 * 휴리스틱: 같은 건물·같은 층에서 이름이 "<공통 이름> <번호>[ (설명)]" 형태인 열람실이 2개 이상이면
 * 하나의 묶음으로 봅니다. 3층은 묶지 않고, 번호가 없거나 혼자인 열람실도 단독 항목입니다.
 * 결과는 층 오름차순(지하 → 위층)이고, 같은 층에서는 서버가 준 순서를 유지합니다.
 */
export function groupRooms(rooms: RoomDto[]): RoomGroup[] {
	const buckets = new Map<string, { room: RoomDto; n: number | null; note: string }[]>();

	for (const room of rooms) {
		const match = UNGROUPED_FLOORS.has(room.floor) ? null : NUMBERED_NAME.exec(room.name.trim());
		const key = match ? `${room.branchAlias}|${room.floor}|${match[1]}` : `#${room.id}`;
		const bucket = buckets.get(key) ?? [];
		bucket.push({ room, n: match ? Number(match[2]) : null, note: match?.[3]?.trim() ?? '' });
		buckets.set(key, bucket);
	}

	const groups = [...buckets.entries()].map(([key, members]): RoomGroup => {
		const grouped = members.length > 1;
		const sorted = grouped ? [...members].sort((a, b) => (a.n ?? 0) - (b.n ?? 0)) : members;
		const list = sorted.map((m) => m.room);
		const first = list[0];
		const chargeable = list.filter((r) => r.isChargeable);

		return {
			id: first.id,
			name: grouped ? key.split('|').slice(2).join('|') : first.name,
			floor: first.floor,
			branchAlias: first.branchAlias,
			rooms: list,
			labels: grouped ? sorted.map((m) => String(m.n)) : [''],
			notes: grouped ? sorted.map((m) => m.note) : [''],
			available: list.reduce((sum, r) => sum + r.available, 0),
			total: list.reduce((sum, r) => sum + r.total, 0),
			isChargeable: chargeable.length > 0,
			unableMessage: chargeable.length > 0 ? null : first.unableMessage
		};
	});

	// Array.prototype.sort 는 안정 정렬이라 같은 층의 기존 순서가 유지됩니다.
	return groups.sort((a, b) => a.floor - b.floor);
}

export function findGroup(rooms: RoomDto[], roomId: number): RoomGroup | undefined {
	return groupRooms(rooms).find((g) => g.rooms.some((r) => r.id === roomId));
}
