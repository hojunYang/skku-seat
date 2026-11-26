import { USE_MOCK_API as MOCK } from '$app/env/private';

// 공개된 고정 서비스 origin 입니다. 서버(SvelteKit)가 브라우저 대신 이곳에 직접 연결합니다.
export const SKKU_LIBRARY_BASE_URL = 'https://lib.skku.edu';

/** mock 모드는 학교 서버로 어떤 요청도 보내지 않습니다. */
export const USE_MOCK_API: boolean = MOCK;

export const REQUEST_TIMEOUT_MS = 15_000;
