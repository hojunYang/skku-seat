import { describe, expect, it } from 'vitest';
import { tokenExpiryMs, tokenFromResponseJson, tokenFromSetCookies } from './token';

describe('tokenFromResponseJson', () => {
	it('알려진 위치에서만 토큰을 읽음', () => {
		expect(tokenFromResponseJson({ accessToken: 'a' })).toBe('a');
		expect(tokenFromResponseJson({ data: { accessToken: 'b' } })).toBe('b');
		expect(tokenFromResponseJson({ result: { accessToken: 'c' } })).toBe('c');
		expect(tokenFromResponseJson({ data: { token: 'x' } })).toBeUndefined();
		expect(tokenFromResponseJson(null)).toBeUndefined();
		expect(tokenFromResponseJson({ accessToken: '' })).toBeUndefined();
	});
});

describe('tokenFromSetCookies', () => {
	const encoded = encodeURIComponent(JSON.stringify({ accessToken: 'tok123' }));

	it('LOPE_PYXIS3 쿠키 값에서 토큰 추출', () => {
		expect(tokenFromSetCookies(['X=1; Path=/', `LOPE_PYXIS3=${encoded}; Path=/; HttpOnly`])).toBe('tok123');
	});

	it('따옴표로 감싼 값도 처리', () => {
		expect(tokenFromSetCookies([`LOPE_PYXIS3="${encoded}"; Path=/`])).toBe('tok123');
	});

	it('깨진 값이나 없는 쿠키는 undefined', () => {
		expect(tokenFromSetCookies(['LOPE_PYXIS3=%E0%A4%A; Path=/'])).toBeUndefined();
		expect(tokenFromSetCookies(['OTHER=1'])).toBeUndefined();
		expect(tokenFromSetCookies([])).toBeUndefined();
	});
});

describe('tokenExpiryMs', () => {
	const jwt = (payload: unknown) =>
		['h', Buffer.from(JSON.stringify(payload)).toString('base64url'), 's'].join('.');

	it('JWT 의 exp 를 ms 로 반환', () => {
		expect(tokenExpiryMs(jwt({ exp: 1_800_000_000 }))).toBe(1_800_000_000_000);
	});

	it('JWT 가 아니거나 exp 가 없으면 undefined', () => {
		expect(tokenExpiryMs('opaque-token')).toBeUndefined();
		expect(tokenExpiryMs(jwt({ sub: 'x' }))).toBeUndefined();
		expect(tokenExpiryMs('a.!!!.c')).toBeUndefined();
	});
});
