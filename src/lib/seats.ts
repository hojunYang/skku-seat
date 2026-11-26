import type { SeatSummary } from './types';

export type SeatAvailability = 'available' | 'occupied' | 'unknown';

export function getSeatAvailability(seat: SeatSummary): SeatAvailability {
	if (seat.isOccupied === false) return 'available';
	if (seat.isOccupied === true) return 'occupied';
	return 'unknown';
}

export function mergeSeatOccupancies(
	seats: SeatSummary[],
	occupiedBySeatId: Record<number, boolean>
): SeatSummary[] {
	return seats.map((seat) => {
		if (typeof seat.isOccupied === 'boolean') return seat;
		const isOccupied = occupiedBySeatId[seat.id];
		return typeof isOccupied === 'boolean' ? { ...seat, isOccupied } : seat;
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * 좌석 목록 응답은 스키마가 확정되지 않았습니다. id/code 가 있는 항목만 보수적으로 추출하며
 * 상태나 좌표를 추측하지 않습니다.
 */
export function extractSeatSummaries(payload: unknown): SeatSummary[] {
	const pick = (list: unknown[]): SeatSummary[] =>
		list.flatMap((item) => {
			if (!isRecord(item) || typeof item.id !== 'number' || typeof item.code !== 'string') return [];
			return [
				{
					id: item.id,
					code: item.code,
					...(typeof item.isOccupied === 'boolean' ? { isOccupied: item.isOccupied } : {})
				}
			];
		});

	if (Array.isArray(payload)) return pick(payload);
	if (!isRecord(payload)) return [];
	for (const candidate of [payload.list, payload.seats, payload.data]) {
		if (Array.isArray(candidate)) return pick(candidate);
	}
	return [];
}

/**
 * 상태가 없는 좌석의 점유 여부를 작은 워커 풀로 조회합니다. 목록에 값이 있으면 항상 그 값이 우선합니다.
 */
export async function lookupOccupancies(
	seats: SeatSummary[],
	fetchOne: (seat: SeatSummary) => Promise<boolean>,
	onResolved: (seatId: number, isOccupied: boolean) => void,
	signal: AbortSignal,
	concurrency = 6
): Promise<number[]> {
	const targets = seats.filter((seat) => typeof seat.isOccupied !== 'boolean');
	const failed: number[] = [];
	let next = 0;

	async function worker() {
		while (next < targets.length && !signal.aborted) {
			const seat = targets[next++];
			try {
				const occupied = await fetchOne(seat);
				if (!signal.aborted) onResolved(seat.id, occupied);
			} catch {
				// 개별 좌석의 일시적 실패가 전체 상태 표시를 막으면 안 됩니다.
				failed.push(seat.id);
			}
		}
	}

	await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
	return failed;
}
