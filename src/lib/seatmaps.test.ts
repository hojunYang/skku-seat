import { describe, expect, it } from 'vitest';
import { getSeatMapLayout, roomKey, seatCodeKey } from './seatmaps';

describe('roomKey', () => {
	it('공백과 뒤의 괄호 설명을 무시', () => {
		expect(roomKey('[B1] A열람실 3 (노트북)')).toBe('[b1]a열람실3');
		expect(roomKey('[B1]  B열람실 2')).toBe(roomKey('[B1] B열람실 2 (노트북)'));
		expect(roomKey('Research Commons')).toBe(roomKey('research  commons'));
	});
});

describe('getSeatMapLayout', () => {
	it('자연과학캠퍼스 열람실의 배치도를 찾음', () => {
		const layout = getSeatMapLayout('science', '[B1] A열람실 1');
		expect(layout?.image).toBe('/seatmaps/b1-a-1.jpg');
		expect(layout?.seats).toHaveLength(210);
	});

	it('다른 캠퍼스이거나 배치도가 없으면 null', () => {
		expect(getSeatMapLayout('humanities', '[B1] A열람실 1')).toBeNull();
		expect(getSeatMapLayout('science', '킹고존')).toBeNull();
		expect(getSeatMapLayout('humanities', '없는 열람실')).toBeNull();
	});

	it('17곳 모두 좌석 좌표가 있고 번호가 중복되지 않음', () => {
		const names = [
			'[B1] A열람실 1', '[B1] A열람실 2', '[B1] A열람실 3', '[B1] B열람실 1', '[B1] B열람실 2',
			'[4F] F열람실 1', '[4F] F열람실 2', '[4F] G열람실 1', '[4F] G열람실 2',
			'[1F] 컴넷 A', '[1F] 노트북열람석 (컴넷)', '[2F] MULTIMEDIA ZONE (노트북)',
			'[3F] 정보검색 ZONE-A', '[3F] 정보검색 ZONE-B', '[3F] 정보검색 ZONE-C', '[3F] 정보검색 ZONE-D', '[3F] 정보검색 ZONE-E'
		];
		for (const name of names) {
			const layout = getSeatMapLayout('science', name);
			expect(layout, name).not.toBeNull();
			const codes = layout!.seats.map((s) => s.code);
			expect(new Set(codes).size, name).toBe(codes.length);
		}
	});
});

describe('인문사회과학캠퍼스 배치도', () => {
	const names = [
		'제1열람실-1', '제1열람실-2', '제1열람실-3', '제1열람실-4', '제2열람실(노트북)', '제3열람실(노트북)',
		'킹고존', 'Research Commons', '대학원라운지', '학부열람실 A', '학부열람실 B'
	];

	it('11곳 모두 좌석 좌표와 칩 크기가 있음', () => {
		for (const name of names) {
			const layout = getSeatMapLayout('humanities', name);
			expect(layout, name).not.toBeNull();
			expect(layout!.style).toBe('box');
			expect(layout!.seats.length, name).toBeGreaterThan(0);
			for (const seat of layout!.seats) expect(seat.cw > 0 && seat.ch > 0, `${name} ${seat.code}`).toBe(true);
		}
	});

	it('원본의 좌석 위치 수를 보존(학부열람실 B 는 148·98 번이 두 위치)', () => {
		expect(getSeatMapLayout('humanities', '제1열람실-1')?.seats).toHaveLength(184);
		expect(getSeatMapLayout('humanities', '킹고존')?.seats).toHaveLength(99);
		const b = getSeatMapLayout('humanities', '학부열람실 B')!;
		expect(b.seats).toHaveLength(204);
		expect(b.seats.filter((s) => s.code === '148')).toHaveLength(2);
	});

	it('회전된 좌석은 경계상자보다 작은 칩으로 그림', () => {
		const rotated = getSeatMapLayout('humanities', '킹고존')!.seats.filter((s) => s.w > 66 || s.h > 66);
		expect(rotated.length).toBeGreaterThan(0);
		for (const seat of rotated) expect(seat.cw).toBeLessThan(seat.w);
	});
});

describe('seatCodeKey', () => {
	it('앞자리 0 을 무시', () => {
		expect(seatCodeKey('007')).toBe(seatCodeKey('7'));
		expect(seatCodeKey(' 12 ')).toBe('12');
	});
});
