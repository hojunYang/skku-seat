import { describe, expect, it } from 'vitest';
import { extractSeatSummaries, getSeatAvailability, lookupOccupancies, mergeSeatOccupancies } from './seats';

describe('extractSeatSummaries', () => {
	it('빈 응답은 빈 배열', () => {
		expect(extractSeatSummaries(undefined)).toEqual([]);
		expect(extractSeatSummaries({})).toEqual([]);
	});

	it('내부 id 와 표시 번호를 분리해서 보존', () => {
		expect(extractSeatSummaries({ list: [{ id: 3189, code: '471' }, { id: 'x', code: '1' }] })).toEqual([
			{ id: 3189, code: '471' }
		]);
	});

	it('목록의 isOccupied 는 그대로 유지', () => {
		const [seat] = extractSeatSummaries([{ id: 1, code: '1', isOccupied: true }]);
		expect(getSeatAvailability(seat)).toBe('occupied');
	});
});

describe('mergeSeatOccupancies', () => {
	it('목록에 값이 있으면 조회 값으로 덮어쓰지 않음', () => {
		const merged = mergeSeatOccupancies(
			[{ id: 1, code: '1', isOccupied: false }, { id: 2, code: '2' }],
			{ 1: true, 2: true }
		);
		expect(merged.map(getSeatAvailability)).toEqual(['available', 'occupied']);
	});
});

describe('lookupOccupancies', () => {
	it('실패한 좌석만 unknown 으로 남김', async () => {
		const resolved: Record<number, boolean> = {};
		const failed = await lookupOccupancies(
			[{ id: 1, code: '1' }, { id: 2, code: '2' }, { id: 3, code: '3', isOccupied: false }],
			async (seat) => {
				if (seat.id === 2) throw new Error('boom');
				return true;
			},
			(id, occupied) => (resolved[id] = occupied),
			new AbortController().signal
		);
		expect(resolved).toEqual({ 1: true });
		expect(failed).toEqual([2]);
	});
});
