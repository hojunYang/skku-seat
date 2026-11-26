<script lang="ts">
	import { getSeatAvailability } from '#lib/seats';
	import type { SeatSummary } from '#lib/types';

	let { seat, onselect }: { seat: SeatSummary; onselect: (seat: SeatSummary) => void } = $props();

	const availability = $derived(getSeatAvailability(seat));
	const label = $derived(
		availability === 'available' ? '이용 가능' : availability === 'occupied' ? '사용 중' : '상태 확인 중'
	);
	// 5열 그리드에서도 줄바꿈되지 않도록 화면에는 짧은 문구를 씁니다(스크린리더는 위의 전체 문구).
	const caption = $derived(
		availability === 'available' ? '빈좌석' : availability === 'occupied' ? '사용중' : '확인중'
	);
</script>

<button
	type="button"
	class="seat {availability}"
	aria-label={`${seat.code}번 좌석, ${label}, 상세 보기`}
	onclick={() => onselect(seat)}
>
	<span class="code">{seat.code}</span>
	<span class="caption">{caption}</span>
</button>

<style>
	.seat {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 64px;
		padding: 8px 2px;
		border: 0;
		background: var(--bg);
		cursor: pointer;
	}
	.seat:hover,
	.seat:active {
		background: var(--chip);
	}
	.seat:focus-visible {
		z-index: 1;
		outline-offset: -2px;
	}
	.code {
		color: var(--text);
		font-size: 17px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.caption {
		margin-top: 2px;
		color: var(--muted);
		font-size: 11px;
	}
	.available .caption {
		color: var(--available);
	}
	.occupied .caption {
		color: var(--danger);
	}
</style>
