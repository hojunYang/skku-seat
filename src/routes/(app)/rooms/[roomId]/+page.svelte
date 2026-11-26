<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import SeatCell from '#lib/components/SeatCell.svelte';
	import SeatMap from '#lib/components/SeatMap.svelte';
	import SeatSheet from '#lib/components/SeatSheet.svelte';
	import { floorLabel } from '#lib/rooms';
	import { getSeatAvailability, lookupOccupancies, mergeSeatOccupancies } from '#lib/seats';
	import { getSeatMapLayout } from '#lib/seatmaps';
	import type { SeatSummary } from '#lib/types';

	let { data } = $props();

	let selected = $state<{ seat: SeatSummary; roomId: number } | null>(null);
	let resolved = $state<Record<number, boolean>>({});
	let failedCount = $state(0);
	let hydrating = $state(false);
	let refreshing = $state(false);

	// 검색 / 필터
	let query = $state('');
	let onlyAvailable = $state(false);

	const multi = $derived(data.sections.length > 1);
	const backHref = $derived(
		`/?campus=${data.campus}${data.floor !== null && page.url.searchParams.get('floor') === String(data.floor) ? `&floor=${data.floor}` : ''}`
	);

	let view = $state<'map' | 'list'>('map');
	let activeRoomId = $state<number | null>(null);

	const layouts = $derived(new Map(data.sections.map((s) => [s.roomId, getSeatMapLayout(data.campus, s.name)])));
	const hasMap = $derived([...layouts.values()].some((layout) => layout !== null));
	const showMap = $derived(view === 'map' && hasMap);

	// 목록에 없던 점유 상태를 조회 결과로 채운 구역별 좌석
	const sections = $derived(
		data.sections.map((section) => ({ ...section, seats: mergeSeatOccupancies(section.seats, resolved) }))
	);

	// 배치도 보기에서 한 번에 한 구역만 보여 줍니다(폰 화면에 맞추기 위해 토글로 전환).
	const activeSection = $derived(
		sections.find((s) => s.roomId === activeRoomId) ?? sections.find((s) => s.roomId === data.roomId) ?? sections[0]
	);
	const activeLayout = $derived(activeSection ? (layouts.get(activeSection.roomId) ?? null) : null);

	const normalizedQuery = $derived(query.trim().toLowerCase());
	const filtering = $derived(normalizedQuery !== '' || onlyAvailable);

	function matchesFilter(seat: SeatSummary): boolean {
		return (
			(normalizedQuery === '' || seat.code.toLowerCase().includes(normalizedQuery)) &&
			(!onlyAvailable || getSeatAvailability(seat) === 'available')
		);
	}

	const visibleSections = $derived(
		sections
			.map((section) => ({
				...section,
				visible: section.seats.filter(matchesFilter)
			}))
			// 필터 중에는 해당 좌석이 없는 구역을 숨깁니다.
			.filter((section) => !filtering || section.visible.length > 0 || section.seatsError)
	);

	const visibleCount = $derived(visibleSections.reduce((sum, s) => sum + s.visible.length, 0));

	const counts = $derived.by(() => {
		let available = 0;
		let occupied = 0;
		let unknown = 0;
		for (const section of sections) {
			for (const seat of section.seats) {
				const a = getSeatAvailability(seat);
				if (a === 'available') available++;
				else if (a === 'occupied') occupied++;
				else unknown++;
			}
		}
		return { available, occupied, unknown, total: available + occupied + unknown };
	});

	// 목록에 점유 상태가 없는 좌석은 좌석 상세로 점진적으로 채웁니다. 데이터가 바뀌면 이전 조회는 취소됩니다.
	$effect(() => {
		const { sections: list, campus } = data;
		const controller = new AbortController();
		resolved = {};
		failedCount = 0;

		const roomOfSeat = new Map<number, number>();
		const seats: SeatSummary[] = [];
		for (const section of list) {
			for (const seat of section.seats) {
				roomOfSeat.set(seat.id, section.roomId);
				seats.push(seat);
			}
		}
		if (!seats.some((s) => typeof s.isOccupied !== 'boolean')) return;

		hydrating = true;
		void lookupOccupancies(
			seats,
			async (seat) => {
				const res = await fetch(`/api/seats/${roomOfSeat.get(seat.id)}/${seat.id}?campus=${campus}`, {
					signal: controller.signal
				});
				if (!res.ok) throw new Error(String(res.status));
				return ((await res.json()) as { isOccupied: boolean }).isOccupied;
			},
			(id, occupied) => (resolved = { ...resolved, [id]: occupied }),
			controller.signal
		).then((failed) => {
			if (controller.signal.aborted) return;
			failedCount = failed.length;
			hydrating = false;
		});

		return () => {
			controller.abort();
			hydrating = false;
		};
	});

	async function refresh() {
		refreshing = true;
		try {
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}

	function resetFilters() {
		query = '';
		onlyAvailable = false;
	}
</script>

<svelte:head>
	<title>{data.title} · SKKU Seat</title>
</svelte:head>

<main class="screen wide" class:map-capable={hasMap}>
	<div class="nav">
		<a href={backHref} class="back">‹ 열람실 목록</a>
		<button class="link" onclick={refresh} disabled={refreshing}>{refreshing ? '갱신 중' : '새로고침'}</button>
	</div>

	<section class="header">
		<h1>{data.title}</h1>
		{#if data.floor !== null}<p class="meta">{floorLabel(data.floor)}</p>{/if}
		{#if data.available !== null && data.total !== null}
			<p class="count">{data.available} / {data.total}석 이용 가능</p>
		{/if}
		{#if multi && showMap && activeSection}
			<div class="line-tabs seat-panel section-switch" role="tablist" aria-label="구역 선택">
				{#each sections as section (section.roomId)}
					{@const hits = filtering ? section.seats.filter(matchesFilter).length : null}
					<button
						type="button"
						role="tab"
						class="tab"
						aria-selected={section.roomId === activeSection.roomId}
						onclick={() => (activeRoomId = section.roomId)}
					>
						<span class="part-label">{section.label}구역{section.note ? ` · ${section.note}` : ''}</span>
						<span class="part-count">{#if hits !== null}{hits}석 일치{:else}<b>{section.available}</b>/{section.total}{/if}</span>
					</button>
				{/each}
			</div>
		{:else if multi}
			<ul class="parts" aria-label="구역별 이용 가능 좌석">
				{#each data.sections as section (section.roomId)}
					<li>
						<span class="part-label">{section.label}구역{section.note ? ` · ${section.note}` : ''}</span>
						<span class="part-count"><b>{section.available}</b>/{section.total}</span>
					</li>
				{/each}
			</ul>
		{/if}
		{#if data.detail?.period}<p class="meta">운영 시간 {data.detail.period}</p>{/if}
		{#if data.detail?.attention}<p class="notice">{data.detail.attention}</p>{/if}
		{#if data.detailError}<p class="error-text">{data.detailError}</p>{/if}
	</section>

	<!-- 검색 / 빈좌석 필터 -->
	<div class="toolbar">
		<label class="search">
			<span class="sr-only">좌석번호 검색</span>
			<input
				type="search"
				inputmode="search"
				autocomplete="off"
				placeholder="좌석번호 검색"
				bind:value={query}
			/>
		</label>
		<button
			type="button"
			class="toggle"
			class:on={onlyAvailable}
			aria-pressed={onlyAvailable}
			onclick={() => (onlyAvailable = !onlyAvailable)}
		>
			빈좌석만
		</button>
	</div>

	{#if hasMap}
		<div class="line-tabs seat-panel view-switch" role="group" aria-label="보기 방식">
			<button type="button" aria-pressed={view === 'map'} onclick={() => (view = 'map')}>
				배치도
			</button>
			<button type="button" aria-pressed={view === 'list'} onclick={() => (view = 'list')}>
				번호
			</button>
		</div>
	{/if}

	{#if counts.total > 0}
		<div class="legend">
			<span class="available">● 이용 가능 {counts.available}</span>
			<span class="occupied">● 사용 중 {counts.occupied}</span>
			{#if counts.unknown > 0}<span class="unknown">● 확인 중 {counts.unknown}</span>{/if}
			{#if filtering}<span class="shown" aria-live="polite">· {visibleCount}석 표시</span>{/if}
		</div>
		{#if hydrating}<p class="meta">상태 정보가 없는 좌석을 확인하는 중…</p>{/if}
		{#if failedCount > 0}
			<p class="warn">{failedCount}석의 상태를 확인하지 못했습니다. 새로고침해주세요.</p>
		{/if}
	{/if}

	{#snippet seatGrid(list: SeatSummary[], roomId: number)}
		<div class="grid">
			{#each list as seat (seat.id)}
				<SeatCell {seat} onselect={(s) => (selected = { seat: s, roomId })} />
			{/each}
		</div>
	{/snippet}

	{#if showMap && activeSection}
		<section class="zone" aria-label={activeSection.label ? `${activeSection.label}구역 배치도` : activeSection.name}>
			{#if activeSection.seatsError}
				<div class="center card">
					<p class="muted">{activeSection.seatsError}</p>
					<button class="btn" onclick={refresh}>다시 시도</button>
				</div>
			{:else if activeLayout}
				{#key activeSection.roomId}
					<SeatMap
						layout={activeLayout}
						seats={activeSection.seats}
						matches={filtering ? matchesFilter : null}
						onselect={(s) => (selected = { seat: s, roomId: activeSection.roomId })}
					/>
				{/key}
			{:else}
				<p class="meta">이 구역은 배치도가 없어 번호로 표시합니다.</p>
				{@render seatGrid(activeSection.seats.filter(matchesFilter), activeSection.roomId)}
			{/if}
		</section>
	{:else}
		{#each visibleSections as section (section.roomId)}
			<section class="zone" aria-label={section.label ? `${section.label}구역` : section.name}>
				{#if multi}
					<div class="zone-head">
						<h2>{section.label}구역{section.note ? ` · ${section.note}` : ''}</h2>
						<span class="zone-count"><b>{section.available}</b> / {section.total}석</span>
					</div>
				{/if}
				{#if section.seatsError}
					<div class="center card">
						<p class="muted">{section.seatsError}</p>
						<button class="btn" onclick={refresh}>다시 시도</button>
					</div>
				{:else}
					{@render seatGrid(section.visible, section.roomId)}
				{/if}
			</section>
		{/each}
	{/if}

	{#if counts.total === 0 && !data.sections.some((s) => s.seatsError)}
		<p class="muted center">이 열람실의 좌석 목록을 불러오지 못했습니다. 새로고침해주세요.</p>
	{:else if filtering && visibleCount === 0}
		<div class="center">
			<p class="muted">조건에 맞는 좌석이 없습니다.</p>
			<button class="btn outline" onclick={resetFilters}>필터 초기화</button>
		</div>
	{/if}
</main>

{#if selected}
	{#key selected.seat.id}
		<SeatSheet campus={data.campus} roomId={selected.roomId} seat={selected.seat} onclose={() => (selected = null)} />
	{/key}
{/if}

<style>
	.screen.map-capable {
		max-width: 1120px;
	}
	.view-switch button {
		flex: 1;
		justify-content: center;
	}
	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.back,
	.link {
		padding: 8px 0;
		border: 0;
		background: none;
		color: var(--primary);
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
	}
	.link:disabled {
		opacity: 0.55;
	}
	.header {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-block: 22px;
		border-block: 1px solid var(--border);
	}
	h1 {
		margin: 0;
		font-size: clamp(26px, 5vw, 36px);
		font-weight: 700;
		letter-spacing: -0.045em;
	}
	h2 {
		margin: 0;
		font-size: 17px;
		font-weight: 800;
	}
	p {
		margin: 0;
	}
	.meta {
		color: var(--muted);
		font-size: 13px;
		line-height: 1.5;
	}
	.count {
		margin-top: 2px;
		color: var(--primary);
		font-size: 17px;
		font-weight: 800;
	}
	.notice,
	.warn {
		color: var(--warning);
		font-size: 14px;
		line-height: 1.4;
	}
	.parts {
		display: flex;
		margin: 8px 0 2px;
		border-block: 1px solid var(--border);
		padding: 0;
		list-style: none;
	}
	.parts li {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		min-width: 0;
		padding: 8px 4px;
	}
	.parts li + li {
		border-left: 1px solid var(--border);
	}
	.part-label {
		color: var(--muted);
		font-size: 11px;
		font-weight: 600;
	}
	.part-count {
		color: var(--muted);
		font-size: 13px;
		white-space: nowrap;
	}
	.part-count b {
		color: var(--primary);
		font-size: 17px;
		font-weight: 800;
	}

	/* 스크롤해도 검색창과 필터가 보이도록 고정 */
	.toolbar {
		position: sticky;
		top: 0;
		z-index: 5;
		display: flex;
		gap: 8px;
		margin: 0 -20px;
		padding: 8px 20px;
		background: var(--bg);
	}
	.search {
		flex: 1;
		min-width: 0;
	}
	.search input {
		width: 100%;
		height: 44px;
		padding: 0 14px;
		border: 1px solid var(--border);
		border-radius: var(--radius-button);
		background: var(--surface);
		color: var(--text);
		font-size: 16px; /* iOS 에서 포커스 시 확대되지 않도록 */
	}
	.search input::placeholder {
		color: var(--disabled);
	}
	.toggle {
		flex: none;
		height: 44px;
		padding: 0 14px;
		border: 1px solid var(--border);
		border-radius: var(--radius-button);
		background: var(--surface);
		color: var(--muted);
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
		transition:
			background 0.12s,
			color 0.12s,
			border-color 0.12s;
	}
	.toggle.on {
		border-color: var(--available);
		background: var(--available-bg);
		color: var(--available);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		font-size: 13px;
		font-weight: 700;
	}
	.legend .available {
		color: var(--available);
	}
	.legend .occupied {
		color: var(--danger);
	}
	.legend .unknown,
	.legend .shown {
		color: var(--muted);
	}

	.zone {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.zone-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding-top: 6px;
	}
	.zone-count {
		color: var(--muted);
		font-size: 14px;
	}
	.zone-count b {
		color: var(--primary);
		font-size: 17px;
		font-weight: 800;
	}
	.section-switch {
		gap: 0;
		margin-block: 8px 2px;
		border-top: 1px solid var(--border);
	}
	.section-switch .tab {
		flex: 1;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		min-width: 0;
	}
	.section-switch .tab + .tab {
		border-inline-start: 1px solid var(--border);
	}
	.section-switch .tab[aria-selected='true'] .part-label {
		color: var(--primary);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 1px;
		border: 1px solid var(--border);
		background: var(--border);
	}
	@media (min-width: 680px) {
		.grid {
			grid-template-columns: repeat(8, minmax(0, 1fr));
		}
	}
</style>
