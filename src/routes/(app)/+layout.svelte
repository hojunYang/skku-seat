<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { shouldPollCharge } from '#lib/charge';

	let { data, children } = $props();

	const polling = $derived(shouldPollCharge(data.currentSeat));

	// 입실 대기 중에만 포그라운드에서 10초마다 현재 좌석 상태를 갱신합니다.
	$effect(() => {
		if (!polling) return;
		const timer = setInterval(() => {
			if (document.visibilityState === 'visible') void invalidate('app:charges');
		}, 10_000);
		return () => clearInterval(timer);
	});

	// 백그라운드에서 돌아올 때 한 번 갱신합니다.
	$effect(() => {
		const onVisible = () => {
			if (document.visibilityState === 'visible') void invalidate('app:charges');
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => document.removeEventListener('visibilitychange', onVisible);
	});
</script>

{@render children()}
