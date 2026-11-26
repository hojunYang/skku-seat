<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { CAMPUSES, type CampusId } from '#lib/campus';
	import CurrentSeatCard from '#lib/components/CurrentSeatCard.svelte';
	import RoomCard from '#lib/components/RoomCard.svelte';
	import FloorPlan from '#lib/components/FloorPlan.svelte';
	import { getFloorPlan } from '#lib/floorplans';
	import { floorLabel, groupRooms } from '#lib/rooms';

	let { data } = $props();
	let loggingOut = $state(false);
	let refreshing = $state(false);
	const groups = $derived(groupRooms(data.rooms));
	const floorPlans = $derived.by(() => {
		const plans = new Map<number, NonNullable<ReturnType<typeof getFloorPlan>>>();
		for (const floor of new Set(groups.map((group) => group.floor))) {
			const plan = getFloorPlan(data.campus, floor, data.rooms);
			if (plan) plans.set(floor, plan);
		}
		return plans;
	});
	const floorParam = $derived(page.url.searchParams.get('floor'));
	const selectedFloor = $derived([...floorPlans.keys()].find((floor) => String(floor) === floorParam));
	const plan = $derived(selectedFloor === undefined ? undefined : floorPlans.get(selectedFloor));
	const visibleGroups = $derived.by(() => {
		const matches = selectedFloor === undefined ? groups : groups.filter((group) => group.floor === selectedFloor);
		return [...matches].sort((a, b) => Number(b.isChargeable) - Number(a.isChargeable));
	});
	const campusQuery = $derived(`?campus=${data.campus}`);
	const floorQuery = $derived(selectedFloor === undefined ? campusQuery : `${campusQuery}&floor=${selectedFloor}`);

	async function refresh() {
		refreshing = true;
		try {
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}
</script>

<svelte:head>
	<title>열람실 좌석 · SKKU Seat</title>
</svelte:head>

<main class="screen home">
	<header class="top">
		<div>
			<p class="eyebrow">{CAMPUSES[data.campus].label}</p>
			<h1>열람실 좌석</h1>
		</div>
		<div class="actions">
			<a class="link entry-pass" href={`/entry-pass${campusQuery}`} data-sveltekit-preload-data="false" data-sveltekit-reload>출입 바코드</a>
			<button class="link" onclick={refresh} disabled={refreshing}>{refreshing ? '갱신 중' : '새로고침'}</button>
			<form method="POST" action="/logout" onsubmit={() => (loggingOut = true)}>
				<button class="link" disabled={loggingOut}>{loggingOut ? '로그아웃 중' : '로그아웃'}</button>
			</form>
		</div>
	</header>

	<nav class="line-tabs campuses" aria-label="캠퍼스 선택">
		{#each Object.keys(CAMPUSES) as CampusId[] as id (id)}
			<a
				href={`?campus=${id}`}
				aria-current={id === data.campus ? 'page' : undefined}
				data-sveltekit-reset="false"
			>
				{CAMPUSES[id].label}
			</a>
		{/each}
	</nav>

	<section class="current" aria-labelledby="current-heading">
		<h2 id="current-heading">현재 이용 좌석</h2>
		{#if data.currentSeat}
			<div class="seat-panel">
				<CurrentSeatCard charge={data.currentSeat} campus={data.campus} />
			</div>
		{:else}
			<p class="muted empty">현재 이용 중인 좌석이 없습니다.</p>
		{/if}
	</section>

	<section aria-labelledby="rooms-heading">
		<h2 id="rooms-heading">열람실</h2>
		{#if data.roomsError}
			<div class="center card">
				<p class="muted">{data.roomsError}</p>
				<button class="btn" onclick={refresh}>다시 시도</button>
			</div>
		{:else if data.rooms.length === 0}
			<p class="muted empty">이용 가능한 열람실 정보가 없습니다.</p>
		{:else}
			{#if floorPlans.size > 0}
				<nav class="line-tabs floors" aria-label="층별 배치도">
					<a href={campusQuery} aria-current={selectedFloor === undefined ? 'page' : undefined}>전체</a>
					{#each [...floorPlans.keys()] as floor (floor)}
						<a href={`${campusQuery}&floor=${floor}`} aria-current={selectedFloor === floor ? 'page' : undefined}>{floorLabel(floor)}</a>
					{/each}
				</nav>
			{/if}
			<div class="rooms seat-panel">
				{#each visibleGroups as group (group.id)}
					<RoomCard {group} href={`/rooms/${group.id}${floorQuery}`} />
				{/each}
			</div>
			{#if plan && selectedFloor !== undefined}
				<section class="floor-drawing" aria-labelledby="floor-heading">
					<h2 id="floor-heading">{floorLabel(selectedFloor)} 배치도</h2>
					<FloorPlan {plan} campus={data.campus} />
				</section>
			{/if}
		{/if}
	</section>
</main>

<style>
	.home {
		max-width: 1200px;
		gap: 28px;
	}
	.top {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px;
	}
	.eyebrow {
		margin: 0 0 6px;
		color: var(--muted);
		font-size: 13px;
	}
	h1 {
		margin: 0;
		font-size: clamp(26px, 5vw, 40px);
		font-weight: 700;
		letter-spacing: -0.045em;
		line-height: 1.15;
	}
	h2 {
		margin: 0 0 14px;
		font-size: 18px;
		letter-spacing: -0.025em;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0 12px;
	}
	.entry-pass {
		display: inline-flex;
		align-items: center;
	}
	.floors {
		flex-wrap: wrap;
		gap: 0 18px;
		margin-bottom: 12px;
	}
	.floor-drawing {
		margin-top: 24px;
		max-width: 760px;
	}
	.link {
		min-height: 44px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--muted);
		font-size: 13px;
		white-space: nowrap;
		cursor: pointer;
	}
	.link:hover {
		color: var(--primary);
		text-decoration: underline;
	}
	.link:disabled {
		opacity: 0.55;
	}
	.current .empty {
		border-bottom: 1px solid var(--border);
		padding-bottom: 24px;
	}
	.rooms {
		display: grid;
		border-top: 1px solid var(--border);
	}
	.empty {
		margin: 0;
	}

	@media (min-width: 680px) {
		.home {
			gap: 36px;
		}
		.rooms {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			border-bottom: 1px solid var(--border);
		}
		.rooms :global(.room:nth-child(3n + 1)) {
			border-left: 0;
		}
		.rooms :global(.room:nth-child(-n + 3)) {
			border-top: 0;
		}
	}
</style>
