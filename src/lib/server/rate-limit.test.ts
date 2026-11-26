import { describe, expect, it } from 'vitest';
import { checkLoginRate, recordLoginFailure, resetLoginRate } from './rate-limit';

describe('login rate limit', () => {
	it('8번 실패하면 차단하고 시간이 지나면 풀림', () => {
		const now = 1_000_000;
		for (let i = 0; i < 7; i++) recordLoginFailure('ip1', now);
		expect(checkLoginRate('ip1', now)).toBeNull();
		recordLoginFailure('ip1', now);
		expect(checkLoginRate('ip1', now)).toBe(10);
		expect(checkLoginRate('ip1', now + 11 * 60_000)).toBeNull();
	});

	it('성공 시 초기화', () => {
		for (let i = 0; i < 8; i++) recordLoginFailure('ip2');
		resetLoginRate('ip2');
		expect(checkLoginRate('ip2')).toBeNull();
	});
});
