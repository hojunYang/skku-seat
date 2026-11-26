import { expect, it } from 'vitest';
import { canEncodeCode39, layoutCode39 } from './code39';

it('draws Code 39 start and stop patterns with ten narrow modules of quiet space on each side', () => {
	const layout = layoutCode39('A', 300);
	expect(layout?.bars).toHaveLength(15);
	if (!layout) throw new Error('No layout');
	const { bars, width, narrow, wide } = layout;
	expect(bars[0].x).toBe(narrow * 10);
	expect(bars.slice(0, 5).map((bar) => bar.width)).toEqual([narrow, narrow, wide, wide, narrow]);
	expect(bars.slice(-5).map((bar) => bar.width)).toEqual([narrow, narrow, wide, wide, narrow]);
	expect(width - bars.at(-1)!.x - bars.at(-1)!.width).toBe(narrow * 10);
	expect(width).toBeLessThanOrEqual(300);
});

it('rejects embedded start markers and reports when the available width is too narrow', () => {
	expect(canEncodeCode39('DEMO*')).toBe(false);
	expect(canEncodeCode39('')).toBe(false);
	expect(layoutCode39('DEMO', 20)).toBeNull();
});
