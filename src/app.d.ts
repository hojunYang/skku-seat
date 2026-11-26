declare global {
	namespace App {
		interface Locals {
			/** 도서관 access token. httpOnly 쿠키에서만 읽으며 클라이언트로는 절대 내려가지 않습니다. */
			token: string | null;
		}
	}
}

export {};
