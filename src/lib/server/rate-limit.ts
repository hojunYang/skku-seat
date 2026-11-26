/**
 * 로그인 시도 제한(IP 기준, 인메모리). 학교 계정 잠금과 무차별 대입을 막기 위한 최소한의 장치입니다.
 * 인스턴스 재시작 시 초기화되며 어떤 인증정보도 저장하지 않습니다.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const attempts = new Map<string, { count: number; resetAt: number }>();

function prune(now: number) {
	if (attempts.size < 1000) return;
	for (const [key, value] of attempts) if (value.resetAt <= now) attempts.delete(key);
}

/** 제한에 걸렸으면 남은 대기 시간(분)을, 아니면 null 을 반환합니다. */
export function checkLoginRate(key: string, now = Date.now()): number | null {
	prune(now);
	const entry = attempts.get(key);
	if (!entry || entry.resetAt <= now) return null;
	return entry.count >= MAX_ATTEMPTS ? Math.ceil((entry.resetAt - now) / 60_000) : null;
}

export function recordLoginFailure(key: string, now = Date.now()): void {
	const entry = attempts.get(key);
	if (!entry || entry.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
	else entry.count += 1;
}

export function resetLoginRate(key: string): void {
	attempts.delete(key);
}
