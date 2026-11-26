<script lang="ts">
	import { tick } from 'svelte';
	import { getSeatAvailability } from '#lib/seats';
	import { seatCodeKey, type SeatMapLayout } from '#lib/seatmaps';
	import type { SeatSummary } from '#lib/types';

	let {
		layout,
		seats,
		matches,
		onselect
	}: {
		layout: SeatMapLayout;
		seats: SeatSummary[];
		/** 검색/필터 조건. 맞지 않는 좌석은 흐리게 표시합니다. null 이면 모든 좌석이 해당 */
		matches: ((seat: SeatSummary) => boolean) | null;
		onselect: (seat: SeatSummary) => void;
	} = $props();

	/** 이 배율 이상이면 좌석 번호를 보여 주고, 미만이면 상태 점만 보여 줍니다. */
	const LABEL_MIN_SCALE = 0.4;
	const MAX_SCALE = 1.2;
	/** 처음 열 때 번호가 읽히는 정도의 배율(화면이 더 넓으면 전체가 보이는 배율) */
	const DEFAULT_SCALE = 0.55;
	const STEP = 1.3;

	let viewport = $state<HTMLDivElement>();
	let viewWidth = $state(0);
	let requested = $state<number | null>(null);

	const fit = $derived(viewWidth > 0 ? Math.min(viewWidth / layout.width, MAX_SCALE) : DEFAULT_SCALE);
	const scale = $derived(Math.min(Math.max(requested ?? DEFAULT_SCALE, fit), MAX_SCALE));
	const showLabels = $derived(scale >= LABEL_MIN_SCALE);
	const atMin = $derived(scale <= fit + 0.001);
	const atMax = $derived(scale >= MAX_SCALE - 0.001);

	const byCode = $derived(new Map(seats.map((seat) => [seatCodeKey(seat.code), seat])));

	const box = $derived(layout.style === 'box');

	const placed = $derived(
		layout.seats.map((pos) => {
			const seat = byCode.get(seatCodeKey(pos.code));
			return {
				pos,
				seat,
				availability: seat ? getSeatAvailability(seat) : ('none' as const),
				dim: matches !== null && (!seat || !matches(seat))
			};
		})
	);

	/** 화면 좌표(cx, cy) 지점이 제자리에 있도록 배율을 바꿉니다. */
	async function zoomTo(next: number, cx?: number, cy?: number) {
		const el = viewport;
		const prev = scale;
		const target = Math.min(Math.max(next, fit), MAX_SCALE);
		if (!el || target === prev) return;
		const px = cx ?? el.clientWidth / 2;
		const py = cy ?? el.clientHeight / 2;
		const left = ((el.scrollLeft + px) / prev) * target - px;
		const top = ((el.scrollTop + py) / prev) * target - py;
		requested = target;
		await tick();
		el.scrollLeft = left;
		el.scrollTop = top;
	}

	// 두 손가락으로 확대/축소. 한 손가락 이동은 브라우저 기본 스크롤을 그대로 씁니다.
	function pinch(node: HTMLElement) {
		let startDistance = 0;
		let startScale = 1;

		const distance = (e: TouchEvent) =>
			Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

		function onstart(e: TouchEvent) {
			if (e.touches.length !== 2) return;
			e.preventDefault();
			startDistance = distance(e);
			startScale = scale;
		}
		function onmove(e: TouchEvent) {
			if (e.touches.length !== 2 || startDistance === 0) return;
			e.preventDefault();
			const rect = node.getBoundingClientRect();
			const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
			const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
			void zoomTo(startScale * (distance(e) / startDistance), cx, cy);
		}
		function onend(e: TouchEvent) {
			if (e.touches.length < 2) startDistance = 0;
		}

		node.addEventListener('touchstart', onstart, { passive: false });
		node.addEventListener('touchmove', onmove, { passive: false });
		node.addEventListener('touchend', onend);
		node.addEventListener('touchcancel', onend);
		return {
			destroy() {
				node.removeEventListener('touchstart', onstart);
				node.removeEventListener('touchmove', onmove);
				node.removeEventListener('touchend', onend);
				node.removeEventListener('touchcancel', onend);
			}
		};
	}

	const availabilityText = { available: '이용 가능', occupied: '사용 중', unknown: '상태 확인 중' } as const;
</script>

<div class="wrap">
	<div class="controls">
		<span class="hint">두 손가락으로 확대 · 밀어서 이동</span>
		<div class="buttons">
			<button type="button" aria-label="축소" disabled={atMin} onclick={() => zoomTo(scale / STEP)}>−</button>
			<button type="button" class="fit" disabled={atMin} onclick={() => zoomTo(fit)}>전체</button>
			<button type="button" aria-label="확대" disabled={atMax} onclick={() => zoomTo(scale * STEP)}>+</button>
		</div>
	</div>

	<div class="viewport" bind:this={viewport} bind:clientWidth={viewWidth} use:pinch>
		<div class="sizer" style:width="{layout.width * scale}px" style:height="{layout.height * scale}px">
			<div
				class="map"
				class:labels={showLabels}
				style:width="{layout.width}px"
				style:height="{layout.height}px"
				style:transform="scale({scale})"
				style:--dot="{9 / scale}px"
				style:background-image={layout.tile ? `url(${layout.tile})` : undefined}
			>
				{#if layout.image}
					<img src={layout.image} alt="열람실 배치도" draggable="false" />
				{/if}
				{#each layout.shapes as shape, i (i)}
					<div
						class="shape {shape.kind} {shape.dir ?? ''}"
						style:left="{shape.x}px"
						style:top="{shape.y}px"
						style:width="{shape.w}px"
						style:height="{shape.h}px"
						style:background-color={shape.bg}
						style:border="{shape.bw ?? 0}px solid {shape.border ?? 'transparent'}"
						style:border-radius={shape.r ? `${shape.r}px` : undefined}
						style:background-image={shape.kind === 'arrow' ? 'url(/seatmaps/hsc-arrow.png)' : undefined}
						style:font-size={shape.fs ? `${shape.fs}px` : undefined}
						aria-hidden="true"
					>
						{#if shape.text}{shape.text}{/if}
					</div>
				{/each}
				{#each placed as { pos, seat, availability, dim }, i (i)}
					<button
						type="button"
						class="seat {availability}"
						class:dim
						style:left="{pos.x}px"
						style:top="{pos.y}px"
						style:width="{pos.w}px"
						style:height="{pos.h}px"
						disabled={!seat || dim}
						aria-label={seat ? `${seat.code}번 좌석, ${availabilityText[availability as keyof typeof availabilityText]}, 상세 보기` : `${pos.code}번 좌석`}
						onclick={() => seat && onselect(seat)}
					>
						<span
							class="badge"
							class:chip={box}
							style:width={box ? `${pos.cw}px` : undefined}
							style:height={box ? `${pos.ch}px` : undefined}
						>{#if showLabels}{pos.code}{/if}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.wrap {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.hint {
		color: var(--muted);
		font-size: 12px;
	}
	.buttons {
		display: flex;
		gap: 6px;
	}
	.buttons button {
		min-width: 40px;
		height: 36px;
		padding: 0 10px;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--surface);
		color: var(--primary);
		font-size: 18px;
		font-weight: 700;
		line-height: 1;
		cursor: pointer;
	}
	.buttons .fit {
		font-size: 13px;
	}
	.buttons button:disabled {
		color: var(--disabled);
		cursor: default;
	}

	.viewport {
		max-height: 72dvh;
		overflow: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		background: var(--surface);
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
	}
	.sizer {
		position: relative;
		overflow: hidden;
	}
	.map {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: 0 0;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}
	.map img {
		position: absolute;
		top: 0;
		left: 0;
		max-width: none;
		width: auto;
		height: auto;
		pointer-events: none;
	}

	.shape {
		position: absolute;
		box-sizing: border-box;
	}
	.pillar {
		background-color: #aaa;
	}
	.arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		background-repeat: no-repeat;
		background-position: 50% 50%;
		color: #393939;
		font-weight: 700;
	}
	/* 출입문: 가운데서 맞물리는 쐐기 모양 */
	.door {
		background: #555;
		clip-path: polygon(0 0, 50% 50%, 100% 0, 100% 100%, 50% 50%, 0 100%);
	}

	.seat {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.seat:disabled {
		cursor: default;
	}
	.badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--dot);
		height: var(--dot);
		border: 1.5px solid #fff;
		border-radius: 50%;
		background: var(--disabled);
		color: var(--on-accent);
		font-size: 20px;
		overflow: hidden;
		font-weight: 800;
		line-height: 1;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.35);
	}
	.labels .badge {
		width: 40px;
		height: 26px;
		border-radius: 7px;
	}
	/* 인문사회과학캠퍼스: 좌석 자체를 직사각형 칩으로 그립니다(크기는 좌석별 인라인 style). */
	.badge.chip,
	.labels .badge.chip {
		border-width: 1px;
		border-radius: 5px;
		font-size: 17px;
	}
	.seat:active:not(:disabled) .badge {
		outline: 3px solid var(--primary);
		outline-offset: 1px;
	}
	.available .badge {
		background: var(--available);
	}
	.occupied .badge {
		background: var(--danger);
	}
	.none .badge {
		background: var(--surface);
		border-color: var(--disabled);
		color: var(--disabled);
		box-shadow: none;
	}
	.dim {
		opacity: 0.18;
	}
</style>
