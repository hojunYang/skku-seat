<script lang="ts">
	import type { CampusId } from '#lib/campus';
	import type { getFloorPlan } from '#lib/floorplans';
	import type { RoomDto } from '#lib/types';

	let { plan, campus }: { plan: NonNullable<ReturnType<typeof getFloorPlan>>; campus: CampusId } = $props();

	function shade(rooms: RoomDto[]): number {
		const total = rooms.reduce((sum, room) => sum + room.total, 0);
		const available = rooms.reduce((sum, room) => sum + room.available, 0);
		return total > 0 ? 15 + 45 * Math.min(Math.max(1 - available / total, 0), 1) : 15;
	}

	function roomHref(room: RoomDto): string {
		return `/rooms/${room.id}?campus=${campus}&floor=${room.floor}`;
	}
</script>

<figure class="floor-plan">
	<div class="drawing">
		<img src={plan.image} alt="" width={plan.viewBox[2]} height={plan.viewBox[3]} />
		<svg viewBox={plan.viewBox.join(' ')} aria-label="층별 배치도" role="group">
			{#each plan.zones as zone (zone.name)}
				{@const room = zone.room}
				{@const parts = zone.parts ?? []}
				{@const related = parts.flatMap((part) => part.room ? [part.room] : [])}
				{@const occupancy = shade(room ? [room] : related)}
				{#snippet geometry()}
					{#if zone.kind === 'polygon'}
						<polygon points={zone.points} />
					{:else}
						<path d={zone.d} fill-rule={zone.fillRule === 'evenodd' ? 'evenodd' : 'nonzero'} />
					{/if}
					{#if zone.label}
						{@const label = zone.label}
						{@const lines = label.text.split('\n')}
						<text x={label.x} y={label.y} font-size={label.size}>
							{#each lines as line, i (i)}
								<tspan x={label.x} y={label.y + (i - (lines.length - 1) / 2) * label.size * 1.15}>{line}</tspan>
							{/each}
						</text>
					{/if}
				{/snippet}
				{#if room?.isChargeable}
					<a href={roomHref(room)} class="zone" aria-label={room.name} style:--occupancy={`${occupancy}%`}>
						{@render geometry()}
					</a>
				{:else}
					<g class="zone muted-zone" style:--occupancy={`${occupancy}%`} aria-hidden="true">
						{@render geometry()}
					</g>
				{/if}
				{#if zone.label}
					{@const label = zone.label}
					{@const width = label.size * 3.4}
					{@const height = label.size * 1.8}
					{@const gap = label.size * 0.45}
					{@const start = label.x - (parts.length * width + (parts.length - 1) * gap) / 2}
					{@const y = label.y + label.size * 0.95}
					{#each parts as part, i (part.name)}
						{@const x = start + i * (width + gap)}
						{#snippet partShape()}
							<rect {x} {y} {width} {height} rx={2} />
							<text x={x + width / 2} y={y + height / 2} font-size={label.size * 0.9}>{part.text}</text>
						{/snippet}
						{#if part.room?.isChargeable}
							<a href={roomHref(part.room)} class="zone" aria-label={part.room.name} style:--occupancy={`${shade([part.room])}%`}>
								{@render partShape()}
							</a>
						{:else}
							<g class="zone muted-zone" aria-hidden="true">{@render partShape()}</g>
						{/if}
					{/each}
				{/if}
			{/each}
		</svg>
	</div>
	<figcaption class="muted">구역을 선택하면 해당 열람실이 열립니다. 진한 곳일수록 좌석이 많이 찼습니다.</figcaption>
</figure>

<style>
	.floor-plan {
		margin: 0;
	}
	.drawing {
		position: relative;
		background: #fff;
		border: 1px solid var(--border);
	}
	img {
		display: block;
		width: 100%;
		height: auto;
	}
	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.zone {
		fill: color-mix(in srgb, #16372b var(--occupancy, 15%), white);
		stroke: white;
		stroke-width: 1.5;
	}
	a.zone {
		pointer-events: auto;
	}
	.muted-zone {
		fill: #edf0ec;
	}
	a.zone:hover,
	a.zone:focus-visible {
		stroke: #16372b;
		stroke-width: 2;
	}
	text {
		dominant-baseline: central;
		text-anchor: middle;
		fill: #18251e;
		stroke: none;
		font-weight: 700;
		pointer-events: none;
	}
	figcaption {
		margin-top: 8px;
	}
</style>
