<script lang="ts">
	import { toViewModel } from '#lib/charge';
	import type { CampusId } from '#lib/campus';
	import type { CurrentSeatDto } from '#lib/types';

	let { charge, campus }: { charge: CurrentSeatDto; campus: CampusId } = $props();
	const vm = $derived(toViewModel(charge));
</script>

<a class="card-link" href={`/current-seat?campus=${campus}`} aria-label={`현재 이용 좌석 ${vm.roomName} ${vm.seatCode}번`}>
	<div class="header">
		<span class="room">{vm.roomName}</span>
		<span class="status">{vm.statusLabel}</span>
	</div>
	<div class="seat">{vm.seatCode}번</div>
	<div class="time">{vm.beginTimeLabel} ~ {vm.endTimeLabel}</div>
	{#if vm.canCheckIn && vm.checkinDeadlineLabel}
		<div class="notice">{vm.checkinDeadlineLabel}까지 입실해 주세요.</div>
	{/if}
</a>

<style>
	.card-link {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 20px var(--screen-gutter);
		border-block: 1px solid var(--border);
	}
	.card-link:hover .room {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.room {
		flex: 1;
		font-size: 16px;
		font-weight: 700;
	}
	.status {
		color: var(--primary);
		font-size: 12px;
		font-weight: 700;
	}
	.seat {
		font-size: 30px;
		font-weight: 700;
	}
	.time {
		color: var(--muted);
		font-size: 14px;
	}
	.notice {
		margin-top: 4px;
		font-size: 14px;
		font-weight: 700;
	}

	@media (min-width: 680px) {
		.card-link {
			padding: 24px clamp(16px, 2.3vw, 28px);
		}
	}
</style>
