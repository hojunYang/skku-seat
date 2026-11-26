<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import type { CampusId } from '#lib/campus';
	import { loginUrl } from '#lib/login-redirect';
	import { formatMinutes } from '#lib/date';
	import type { SeatDetailDto, SeatSummary } from '#lib/types';

	let {
		campus,
		roomId,
		seat,
		onclose
	}: { campus: CampusId; roomId: number; seat: SeatSummary; onclose: () => void } = $props();

	let detail = $state<SeatDetailDto | null>(null);
	let loadError = $state<string | null>(null);
	let loading = $state(true);
	let charging = $state(false);
	let chargeError = $state<string | null>(null);

	async function parseError(res: Response): Promise<string> {
		const body: unknown = await res.json().catch(() => null);
		return typeof body === 'object' && body !== null && 'message' in body ? String((body as { message: unknown }).message) : '요청을 처리하지 못했습니다.';
	}

	async function load(signal?: AbortSignal) {
		loading = true;
		loadError = null;
		try {
			const res = await fetch(`/api/seats/${roomId}/${seat.id}?campus=${campus}`, { signal });
			if (res.status === 401) return void goto(loginUrl(new URL(location.href), { expired: true }));
			if (!res.ok) throw new Error(await parseError(res));
			detail = await res.json();
		} catch (e) {
			if (signal?.aborted) return;
			loadError = e instanceof Error ? e.message : '좌석 정보를 불러오지 못했습니다.';
		} finally {
			if (!signal?.aborted) loading = false;
		}
	}

	// 시트는 좌석마다 {#key} 로 새로 만들어지므로 마운트 때 한 번만 조회합니다.
	// untrack 이 없으면 load 안에서 읽는 campus/roomId 가 부모의 data 를 구독하게 되어,
	// 배정 후 invalidateAll() 로 data 가 바뀔 때 같은 좌석을 다시 조회해 버립니다.
	$effect(() => {
		const controller = new AbortController();
		untrack(() => void load(controller.signal));
		return () => controller.abort();
	});

	async function charge() {
		if (!detail || charging) return;
		charging = true;
		chargeError = null;
		try {
			const res = await fetch('/api/charge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ seatId: detail.id })
			});
			if (res.status === 401) return void goto(loginUrl(new URL(location.href), { expired: true }));
			if (!res.ok) throw new Error(await parseError(res));
			await invalidateAll();
			onclose();
			// 배정이 끝나면 보고 있던 캠퍼스를 유지한 채 홈 화면으로 이동합니다.
			await goto(`/?campus=${campus}`);
		} catch (e) {
			chargeError = e instanceof Error ? e.message : '좌석을 배정하지 못했습니다.';
			// 실패 후에도 최신 좌석/열람실 상태를 반영합니다.
			void invalidateAll();
		} finally {
			charging = false;
		}
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window {onkeydown} />

<div class="backdrop">
	<button type="button" class="backdrop-tap" aria-label="닫기" onclick={onclose}></button>
	<div class="sheet" role="dialog" aria-modal="true" aria-label={`${seat.code}번 좌석 상세`}>
		<div class="handle"></div>
		<div class="content">
			{#if loading}
				<p class="muted center">좌석 정보를 확인하는 중…</p>
			{:else if loadError}
				<div class="center">
					<p class="muted">{loadError}</p>
					<button class="btn" onclick={() => load()}>다시 시도</button>
				</div>
			{:else if detail}
				<div class="code">{detail.code}번</div>
				<div class="type">{detail.seatTypeName}석</div>
				<div class="status" class:occupied={detail.isOccupied}>{detail.isOccupied ? '현재 이용 중' : '이용 가능'}</div>
				<hr />
				<p class="info">기본 이용시간 {formatMinutes(detail.defaultUseTime)}</p>
				{#if chargeError}<p class="error-text" role="alert">{chargeError}</p>{/if}
				<button class="btn charge" disabled={detail.isOccupied || charging} onclick={charge}>
					{charging ? '배정 중…' : detail.isOccupied ? '이용할 수 없는 좌석입니다' : '이 좌석 이용하기'}
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		background: rgb(0 0 0 / 0.38);
	}
	.backdrop-tap {
		position: absolute;
		inset: 0;
		border: 0;
		background: none;
		cursor: default;
	}
	.sheet {
		position: relative;
		width: 100%;
		max-width: 480px;
		min-height: 330px;
		max-height: 75dvh;
		margin: 0 auto;
		overflow-y: auto;
		border-top: 1px solid var(--border);
		border-radius: var(--radius-card) var(--radius-card) 0 0;
		background: var(--surface);
		animation: slide-up 0.22s cubic-bezier(0.32, 0.72, 0, 1);
	}
	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
	}
	.handle {
		width: 44px;
		height: 4px;
		margin: 12px auto 0;
		border-radius: 10px;
		background: var(--disabled);
	}
	.content {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 24px 24px calc(24px + env(safe-area-inset-bottom));
	}
	.code {
		color: var(--primary);
		font-size: 38px;
		font-weight: 800;
	}
	.type {
		font-size: 17px;
		font-weight: 700;
	}
	.status {
		color: var(--available);
		font-size: 15px;
		font-weight: 700;
	}
	.status.occupied {
		color: var(--danger);
	}
	hr {
		width: 100%;
		margin: 8px 0;
		border: 0;
		border-top: 1px solid var(--border);
	}
	.info {
		margin: 0;
		font-size: 15px;
	}
	.error-text {
		margin: 0;
	}
	.charge {
		margin-top: 16px;
	}
</style>
