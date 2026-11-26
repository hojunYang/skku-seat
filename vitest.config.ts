import { defineConfig } from 'vitest/config';

// 테스트 대상은 프레임워크에 의존하지 않는 순수 로직이므로 SvelteKit 플러그인 없이 실행합니다.
export default defineConfig({
	test: { include: ['src/**/*.test.ts'], environment: 'node' }
});
