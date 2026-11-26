<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
</script>

<div class="screen">
	<div class="center" style="flex: 1">
		<h1 style="font-size: 18px; margin: 0">
			{page.status === 404 ? '페이지를 찾을 수 없습니다' : '불러오지 못했습니다'}
		</h1>
		<p class="muted">{page.error?.message}</p>
		<button class="btn" onclick={() => invalidateAll()}>다시 시도</button>
		<a class="muted" href="/">홈으로</a>
	</div>
</div>
