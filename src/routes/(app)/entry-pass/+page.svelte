<script lang="ts">
	import { devicePixelRatio } from 'svelte/reactivity/window';
	import { layoutCode39 } from '#lib/code39';

	let { data } = $props();
	let width = $state(0);

	const pixels = $derived(devicePixelRatio.current ?? 1);
	const barcode = $derived(data.memberNo ? layoutCode39(data.memberNo, Math.floor((width || 320) * pixels)) : null);
</script>

<svelte:head>
	<title>출입 바코드 · SKKU Seat</title>
</svelte:head>

<main class="screen">
	<a class="back" href={`/?campus=${data.campus}`} data-sveltekit-reload>‹ 열람실 목록</a>
	<h1>출입 바코드</h1>

	{#if data.message}
		<div class="card center">
			<p class="error-text">{data.message}</p>
			<a class="btn outline" href={`/entry-pass?campus=${data.campus}`} data-sveltekit-reload>다시 시도</a>
		</div>
	{:else}
		{#if data.mock}<p class="muted">체험용 바코드입니다.</p>{/if}
		<div class="pass" bind:clientWidth={width}>
			{#if barcode}
				<svg
					viewBox={`0 0 ${barcode.width} 100`}
					width={barcode.width / pixels}
					preserveAspectRatio="none"
					shape-rendering="crispEdges"
					role="img"
					aria-label="출입 바코드"
				>
					{#each barcode.bars as bar (bar.x)}
						<rect x={bar.x} y="0" width={bar.width} height="100" />
					{/each}
				</svg>
			{:else}
				<p class="pass-error">화면 폭을 넓히면 바코드를 표시할 수 있습니다.</p>
			{/if}
		</div>
	{/if}
</main>

<style>
	.back {
		align-self: flex-start;
		padding-block: 8px;
		color: var(--primary);
		font-size: 14px;
		font-weight: 700;
	}
	h1,
	p {
		margin: 0;
	}
	h1 {
		font-size: 28px;
		letter-spacing: -0.04em;
	}
	.pass {
		padding-block: 12px;
		border-block: 1px solid var(--border);
		background: #fff;
		color: #18251e;
		text-align: center;
	}
	svg {
		display: block;
		max-width: 100%;
		height: clamp(240px, 60dvh, 520px);
		margin-inline: auto;
		fill: #000;
	}
	.pass-error {
		padding: 20px;
		font-size: 14px;
	}
</style>
