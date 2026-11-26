import type { CampusId } from './campus';
import raw from './seatmaps.json';

/** 배치도 위의 좌석 하나. 좌표는 배치도 좌상단 기준 CSS pixel(배율 1)이고, 좌석 버튼의 경계상자입니다. */
export interface MapSeat {
	code: string;
	x: number;
	y: number;
	w: number;
	h: number;
	/** 칩 모양으로 그릴 때의 크기(회전된 좌석은 경계상자가 커서 줄여서 그립니다) */
	cw: number;
	ch: number;
}

/** 배경 이미지에 없는 기둥·벽·출입문 같은 구조물(인문사회과학캠퍼스) */
export interface MapShape {
	kind: 'pillar' | 'wall' | 'door' | 'arrow';
	x: number;
	y: number;
	w: number;
	h: number;
	bg?: string;
	border?: string;
	bw?: number;
	/** border-radius(px) */
	r?: number;
	/** door: 문이 있는 방향 */
	dir?: string;
	text?: string;
	fs?: number;
}

export interface SeatMapLayout {
	/**
	 * badge: 배경 이미지에 의자가 그려져 있어 번호 배지만 올립니다(자연과학캠퍼스).
	 * box: 좌석을 직사각형 칩으로 직접 그립니다(인문사회과학캠퍼스).
	 */
	style: 'badge' | 'box';
	/** 완성된 배경 이미지 URL (없으면 null) */
	image: string | null;
	/** 반복되는 바닥 타일 URL (없으면 null) */
	tile: string | null;
	width: number;
	height: number;
	shapes: MapShape[];
	seats: MapSeat[];
}

type RawSeat = [string, number, number, number, number];
type RawLayout = {
	image?: string;
	tile?: string;
	style?: 'box';
	width: number;
	height: number;
	shapes?: MapShape[];
	seats: RawSeat[];
};

/** "[B1] A열람실 3 (노트북)" → "[b1]a열람실3". 공백·대소문자·뒤의 괄호 설명 차이는 무시합니다. */
export function roomKey(name: string): string {
	return name
		.replace(/\([^)]*\)\s*$/, '')
		.replace(/\s+/g, '')
		.toLowerCase();
}

/** 이 크기를 넘는 경계상자는 회전된 좌석으로 보고 작은 칩으로 그립니다. */
const MAX_CHIP = 66;
const ROTATED_CHIP = { w: 52, h: 36 };

function load(layouts: Record<string, RawLayout>): Map<string, SeatMapLayout> {
	return new Map(
		Object.entries(layouts).map(([name, layout]) => {
			const style = layout.style ?? 'badge';
			return [
				roomKey(name),
				{
					style,
					image: layout.image ? `/seatmaps/${layout.image}.jpg` : null,
					tile: layout.tile ? `/seatmaps/${layout.tile}` : null,
					width: layout.width,
					height: layout.height,
					shapes: layout.shapes ?? [],
					seats: layout.seats.map(([code, x, y, w, h]) => {
						const rotated = w > MAX_CHIP || h > MAX_CHIP;
						return {
							code,
							x,
							y,
							w,
							h,
							cw: rotated ? ROTATED_CHIP.w : w,
							ch: rotated ? ROTATED_CHIP.h : h
						};
					})
				}
			] as const;
		})
	);
}

const data = raw as unknown as Record<CampusId, Record<string, RawLayout>>;
const layouts: Record<CampusId, Map<string, SeatMapLayout>> = {
	science: load(data.science),
	humanities: load(data.humanities)
};

/** 열람실 이름으로 배치도를 찾습니다. 없으면 null(번호 격자만 표시). */
export function getSeatMapLayout(campus: CampusId, roomName: string): SeatMapLayout | null {
	return layouts[campus].get(roomKey(roomName)) ?? null;
}

/** "007" 과 "7" 을 같은 좌석으로 보기 위한 키 */
export function seatCodeKey(code: string): string {
	const trimmed = code.trim();
	return /^\d+$/.test(trimmed) ? String(Number(trimmed)) : trimmed.toLowerCase();
}
