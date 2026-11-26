import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	/** true 이면 학교 서버를 호출하지 않고 mock 데이터로 동작합니다. */
	USE_MOCK_API: {
		schema: (value) => value === 'true',
		description: 'Mock API 모드. 실제 인증정보를 요구하거나 학교 서버를 호출하지 않습니다.'
	}
});
