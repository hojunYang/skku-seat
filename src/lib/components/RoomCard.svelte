<script lang="ts">
	import { floorLabel, type RoomGroup } from '#lib/rooms';

	let { group, href }: { group: RoomGroup; href: string } = $props();
	const disabled = $derived(!group.isChargeable);
	const multi = $derived(group.rooms.length > 1);
</script>

<svelte:element
	this={disabled ? 'div' : 'a'}
	class="room"
	href={disabled ? undefined : href}
	aria-disabled={disabled}
	aria-labelledby={disabled ? undefined : `room-name-${group.id}`}
>
	<div class="heading">
		<div class="name" id={`room-name-${group.id}`}>{group.name}</div>
		{#if disabled}<span class="unavailable">이용 불가</span>{/if}
	</div>
	<div class="floor">{floorLabel(group.floor)} · {group.branchAlias}학술정보관</div>

	{#if disabled}
		{#if group.unableMessage}<div class="reason">{group.unableMessage}</div>{/if}
	{:else if multi}
		<!-- 구역별 빈좌석/전체: 예) 1구역 77/210, 2구역 32/78, 3구역 5/24 -->
		<ul class="parts" aria-label="구역별 이용 가능 좌석">
			{#each group.rooms as room, i (room.id)}
				<li class:off={!room.isChargeable}>
					<span class="part-label">
						{group.labels[i]}구역{#if group.notes[i]}<small>{group.notes[i]}</small>{/if}
					</span>
					<span class="part-count"><b>{room.available}</b>/{room.total}</span>
				</li>
			{/each}
		</ul>
		<div class="count">합계 {group.available} / {group.total}석 이용 가능</div>
	{:else}
		<div class="count">{group.available} / {group.total}석 이용 가능</div>
	{/if}
</svelte:element>

<style>
	.room {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
		padding: 20px var(--screen-gutter);
		border-bottom: 1px solid var(--border);
	}
	a.room:hover,
	a.room:focus-visible {
		background: var(--chip);
	}
	a.room:hover .name {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.heading {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 4px 12px;
	}
	.unavailable {
		color: var(--danger);
		font-size: 14px;
		font-weight: 700;
		white-space: nowrap;
	}
	.name {
		color: var(--primary);
		font-size: 18px;
		font-weight: 700;
		letter-spacing: -0.035em;
		overflow-wrap: anywhere;
	}
	.floor {
		color: var(--muted);
	}
	.floor,
	.reason,
	.count {
		font-size: 13px;
		line-height: 1.5;
	}
	.count {
		margin-top: auto;
		padding-top: 16px;
		color: var(--primary);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.parts {
		margin: 8px 0 0;
		padding: 0;
		list-style: none;
	}
	.parts li {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
		padding: 6px 0;
		border-bottom: 1px solid var(--border);
		color: var(--text);
		font-size: 13px;
	}
	.parts li.off,
	.part-label small,
	.part-count {
		color: var(--muted);
	}
	.part-label small {
		margin-left: 4px;
	}
	.part-count {
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.room[aria-disabled='true'] :is(.name, .floor, .reason) {
		color: var(--disabled);
	}

	@media (min-width: 680px) {
		.room {
			padding: 24px clamp(16px, 2.3vw, 28px);
			border: 0;
			border-top: 1px solid var(--border);
			border-left: 1px solid var(--border);
		}
	}
</style>
