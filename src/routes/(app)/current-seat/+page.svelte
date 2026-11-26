<script lang="ts">
	import { enhance } from '$app/forms';
	import { toViewModel } from '#lib/charge';

	let { data, form } = $props();
	let pending = $state<'cancel' | 'discharge' | null>(null);

	const charge = $derived(data.currentSeat);
	const vm = $derived(charge ? toViewModel(charge) : null);

</script>

<svelte:head>
	<title>현재 이용 좌석 · SKKU Seat</title>
</svelte:head>

<main class="screen">
	<a href={`/?campus=${data.campus}`} class="back">‹ 열람실 목록</a>

	{#if !charge || !vm}
		<p class="muted center">현재 이용 중인 좌석이 없습니다.</p>
	{:else}
		<section class="detail">
			<p class="room">{vm.roomName}</p>
			<p class="seat">{vm.seatCode}번</p>
			<span class="chip">{vm.statusLabel}</span>

			<div class="info">
				<span class="label">이용시간</span>
				<span class="value">{vm.beginTimeLabel} ~ {vm.endTimeLabel}</span>
			</div>

			{#if vm.canCheckIn}
				<div class="waiting">
					<strong>입실 대기</strong>
					{#if vm.checkinDeadlineLabel}<span>{vm.checkinDeadlineLabel}까지 입실해 주세요.</span>{/if}
					{#if vm.usesGateConfirmation}
						<span>도서관 게이트를 통과하면 좌석 이용 상태가 자동으로 갱신됩니다.</span>
					{/if}
				</div>
			{/if}

			{#if vm.isGateOut}<p class="muted">현재 외출 상태입니다.</p>{/if}
			{#if vm.renewalAvailableFromLabel && !vm.canRenew}
				<p class="muted">{vm.renewalAvailableFromLabel}부터 연장 가능 여부가 갱신됩니다.</p>
			{/if}
			{#if vm.canRenew}<p class="muted">좌석 연장 API가 아직 확인되지 않아 이 앱에서는 연장할 수 없습니다.</p>{/if}
			{#if form?.message}<p class="error-text" role="alert">{form.message}</p>{/if}

			{#if vm.canCancelReservation}
				<form
					method="POST"
					action="?/cancel"
					use:enhance={({ cancel }) => {
						if (!confirm(`${vm.roomName} ${vm.seatCode}번 예약이 취소됩니다. 이 작업은 되돌릴 수 없습니다.`)) {
							cancel();
							return;
						}
						pending = 'cancel';
						return async ({ update }) => {
							await update();
							pending = null;
						};
					}}
				>
					<input type="hidden" name="id" value={charge.id} />
					<button class="btn danger" disabled={pending !== null}>{pending === 'cancel' ? '취소 중…' : '예약 취소'}</button>
				</form>
			{/if}

			{#if vm.canReturn}
				<form
					method="POST"
					action="?/discharge"
					use:enhance={({ cancel }) => {
						if (!confirm(`${vm.roomName} ${vm.seatCode}번 좌석을 반납합니다. 이 작업은 되돌릴 수 없습니다.`)) {
							cancel();
							return;
						}
						pending = 'discharge';
						return async ({ update }) => {
							await update();
							pending = null;
						};
					}}
				>
					<input type="hidden" name="id" value={charge.id} />
					<button class="btn danger" disabled={pending !== null}>{pending === 'discharge' ? '반납 중…' : '반납하기'}</button>
				</form>
			{/if}
		</section>
	{/if}
</main>

<style>
	.back {
		padding: 8px 0;
		color: var(--primary);
		font-size: 14px;
		font-weight: 700;
	}
	.detail {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding-top: 24px;
		border-top: 1px solid var(--border);
	}
	p {
		margin: 0;
	}
	.room {
		font-size: 18px;
		font-weight: 700;
	}
	.seat {
		color: var(--primary);
		font-size: 40px;
		font-weight: 800;
	}
	.chip {
		align-self: flex-start;
		color: var(--primary);
		font-weight: 700;
	}
	.info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-top: 8px;
		padding-top: 16px;
		border-top: 1px solid var(--border);
	}
	.label {
		color: var(--muted);
		font-size: 13px;
	}
	.value {
		font-size: 17px;
		font-weight: 700;
	}
	.waiting {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 16px;
		border-left: 2px solid var(--warning);
		background: var(--warning-bg);
		line-height: 1.4;
	}
	.waiting strong {
		color: var(--warning);
		font-size: 16px;
		font-weight: 800;
	}
</style>
