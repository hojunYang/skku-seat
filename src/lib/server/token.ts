/** 로그인 응답에서 access token 을 꺼내는 순수 함수들. 값은 절대 로그로 남기지 않습니다. */

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** 확인된 위치(`accessToken`)만 탐색합니다. 스키마를 추측하지 않습니다. */
export function tokenFromResponseJson(body: unknown): string | undefined {
	if (!isRecord(body)) return undefined;
	const candidates = [
		body.accessToken,
		isRecord(body.data) ? body.data.accessToken : undefined,
		isRecord(body.result) ? body.result.accessToken : undefined
	];
	return candidates.find((v): v is string => typeof v === 'string' && v.length > 0);
}

/** Set-Cookie 의 `LOPE_PYXIS3` 값은 URL 인코딩된 JSON 이며 그 안에 accessToken 이 있습니다. */
export function tokenFromSetCookies(setCookies: string[]): string | undefined {
	for (const header of setCookies) {
		const match = /^\s*LOPE_PYXIS3=([^;]*)/.exec(header);
		if (!match?.[1]) continue;
		try {
			const raw = match[1].replace(/^"|"$/g, '');
			const parsed: unknown = JSON.parse(decodeURIComponent(raw));
			if (isRecord(parsed) && typeof parsed.accessToken === 'string' && parsed.accessToken) {
				return parsed.accessToken;
			}
		} catch {
			// 다음 쿠키 계속 확인
		}
	}
	return undefined;
}

/**
 * access token 이 JWT 이면 payload 의 `exp`(초 단위 Unix 시각)를 읽어 만료 시각(ms)을 반환합니다.
 * 서명은 검증하지 않으며(수명 확인용), JWT 가 아니거나 exp 가 없으면 undefined 입니다.
 */
export function tokenExpiryMs(token: string): number | undefined {
	const parts = token.split('.');
	if (parts.length !== 3) return undefined;
	try {
		const json = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
		const payload: unknown = JSON.parse(json);
		if (isRecord(payload) && typeof payload.exp === 'number' && Number.isFinite(payload.exp)) {
			return payload.exp * 1000;
		}
	} catch {
		// JWT 형식이 아님
	}
	return undefined;
}
