<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let password = $state('');
	let submitting = $state(false);
</script>

<svelte:head>
	<title>로그인 · SKKU Seat</title>
</svelte:head>

<main class="screen wide login">
	<header>
		<p class="brand">SKKU Seat</p>
		<h1>열람실 좌석</h1>
		<p class="muted">성균관대학교 학술정보관의 비공식 웹 프로토타입입니다.</p>
	</header>

	<div class="login-fields">
		{#if data.mock}
			<p class="mock">Mock API 모드: 아무 값으로 로그인할 수 있습니다.</p>
		{/if}
		{#if data.expired && !form}
			<p class="mock">로그인이 만료되었습니다. 다시 로그인해주세요.</p>
		{/if}

		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					// 성공/실패와 무관하게 요청이 끝나면 비밀번호를 메모리에서 지웁니다.
					await update({ reset: false });
					password = '';
					submitting = false;
				};
			}}
		>
			<label for="loginId">성균관대학교 아이디</label>
			<input
				id="loginId"
				name="loginId"
				type="text"
				autocomplete="username"
				autocapitalize="none"
				autocorrect="off"
				spellcheck="false"
				placeholder="아이디"
				value={form?.loginId ?? ''}
				disabled={submitting}
				required
			/>

			<label for="password">비밀번호</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				placeholder="비밀번호"
				bind:value={password}
				disabled={submitting}
				required
			/>

			{#if form?.message}
				<p class="submit-error" role="alert">{form.message}</p>
			{/if}

			<button class="btn" type="submit" disabled={submitting}>{submitting ? '로그인 중…' : '로그인'}</button>
		</form>

		<p class="privacy">
			아이디와 비밀번호는 이 앱의 서버를 거쳐 학술정보관으로 한 번 전달될 뿐 저장되거나 기록되지 않습니다.
			로그인 상태는 이 브라우저의 보안 쿠키에만 유지됩니다.
		</p>
	</div>
</main>

<style>
	.login {
		justify-content: center;
		gap: 0;
	}
	header {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 0 0 24px;
	}
	.brand {
		margin: 0;
		color: var(--primary);
		font-size: 13px;
		font-weight: 700;
	}
	h1 {
		margin: 0;
		font-size: clamp(30px, 5vw, 42px);
		font-weight: 700;
		letter-spacing: -0.05em;
		line-height: 1.15;
	}
	header .muted {
		margin: 0;
	}
	.login-fields {
		min-width: 0;
		padding: 24px 0;
		border-block: 1px solid var(--border);
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	label {
		margin-top: 5px;
		font-size: 14px;
		font-weight: 700;
	}
	input {
		height: 52px;
		padding: 0 14px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-button);
		color: var(--text);
		font-size: 16px; /* iOS 에서 포커스 시 확대되지 않도록 16px 이상 */
	}
	input::placeholder {
		color: var(--disabled);
	}
	input:disabled {
		opacity: 0.6;
	}
	.btn {
		margin-top: 12px;
	}
	.mock {
		margin: 0 0 12px;
		padding: 8px 12px;
		border-left: 2px solid currentColor;
		background: var(--warning-bg);
		color: var(--warning);
		font-size: 13px;
	}
	.submit-error {
		margin: 4px 0 0;
		padding: 8px 12px;
		border-left: 2px solid currentColor;
		background: var(--danger-bg);
		color: var(--danger);
		font-size: 14px;
	}
	.privacy {
		margin: 24px 0 0;
		color: var(--muted);
		font-size: 12px;
		line-height: 1.6;
	}

	@media (min-width: 680px) {
		.login {
			display: grid;
			grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
			place-content: center stretch;
		}
		header {
			padding: 28px 24px 28px 0;
			border-block: 1px solid var(--border);
		}
		.login-fields {
			padding: 24px 0 24px 28px;
			border-left: 1px solid var(--border);
		}
	}
</style>
