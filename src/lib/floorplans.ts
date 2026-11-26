import type { CampusId } from './campus';
import data from './floorplans.json';
import type { RoomDto } from './types';

type ZoneLabel = { text: string; x: number; y: number; size: number };
type ZonePart = { text: string; name: string };

interface FloorZone {
	name: string;
	kind: string;
	points?: string;
	d?: string;
	fillRule?: string;
	label: ZoneLabel | null;
	parts?: ZonePart[];
}

interface FloorPlan {
	viewBox: number[];
	zones: FloorZone[];
}

const plans: Record<string, FloorPlan> = data;
const libraryAliases: Record<CampusId, string> = { science: '삼성', humanities: '중앙' };

function roomKey(name: string): string {
	return name.replace(/\s+/g, '').toLowerCase();
}

function withoutNote(name: string): string {
	return name.replace(/\([^()]*\)$/, '');
}

export function getFloorPlan(campus: CampusId, floor: number, rooms: RoomDto[]) {
	const level = floor < 0 ? `B${-floor}` : `${floor}F`;
	const id = campus === 'science' ? level : `hsc-${level}`;
	const plan = plans[id];
	if (!plan) return null;

	const candidates = rooms.filter((room) => room.floor === floor && room.branchAlias === libraryAliases[campus]);
	const byName = new Map(candidates.map((room) => [roomKey(room.name), room]));
	function matchRoom(name: string): RoomDto | undefined {
		const key = roomKey(name);
		const exact = byName.get(key);
		if (exact) return exact;
		const matches = candidates.filter((room) => withoutNote(roomKey(room.name)) === withoutNote(key));
		return matches.length === 1 ? matches[0] : undefined;
	}

	const zones = plan.zones.map((zone) => ({
		...zone,
		room: matchRoom(zone.name),
		parts: zone.parts?.map((part) => ({ ...part, room: matchRoom(part.name) }))
	}));
	if (!zones.some((zone) => zone.room || zone.parts?.some((part) => part.room))) return null;

	return { ...plan, image: `/floorplans/${id}.svg`, zones };
}
