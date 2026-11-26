// 참고 프로젝트의 Code 39 막대 배치를 웹 화면에서도 사용합니다.
const PATTERNS: Readonly<Record<string, string>> = {
	"0": "nnnwwnwnn",
	"1": "wnnwnnnnw",
	"2": "nnwwnnnnw",
	"3": "wnwwnnnnn",
	"4": "nnnwwnnnw",
	"5": "wnnwwnnnn",
	"6": "nnwwwnnnn",
	"7": "nnnwnnwnw",
	"8": "wnnwnnwnn",
	"9": "nnwwnnwnn",
	A: "wnnnnwnnw",
	B: "nnwnnwnnw",
	C: "wnwnnwnnn",
	D: "nnnnwwnnw",
	E: "wnnnwwnnn",
	F: "nnwnwwnnn",
	G: "nnnnnwwnw",
	H: "wnnnnwwnn",
	I: "nnwnnwwnn",
	J: "nnnnwwwnn",
	K: "wnnnnnnww",
	L: "nnwnnnnww",
	M: "wnwnnnnwn",
	N: "nnnnwnnww",
	O: "wnnnwnnwn",
	P: "nnwnwnnwn",
	Q: "nnnnnnwww",
	R: "wnnnnnwwn",
	S: "nnwnnnwwn",
	T: "nnnnwnwwn",
	U: "wwnnnnnnw",
	V: "nwwnnnnnw",
	W: "wwwnnnnnn",
	X: "nwnnwnnnw",
	Y: "wwnnwnnnn",
	Z: "nwwnwnnnn",
	"-": "nwnnnnwnw",
	".": "wwnnnnwnn",
	" ": "nwwnnnwnn",
	$: "nwnwnwnnn",
	"/": "nwnwnnnwn",
	"+": "nwnnnwnwn",
	"%": "nnnwnwnwn",
	"*": "nwnnwnwnn",
};

/** 앞뒤 여백. 좁은 칸 10개 이상이 규격이다 */
const QUIET_NARROW = 10;
/**
 * 넓은 칸은 좁은 칸의 2.2~3배로 한다(규격: 좁은 칸이 0.5mm보다 작으면 2.2배 이상).
 * 2배 화면에서는 3배를 고집하면 좁은 칸이 2픽셀에 묶여 바코드가 짧아진다.
 */
const MIN_RATIO = 2.2;
const MAX_RATIO = 3;

/** Code 39로 그릴 수 있는 값인가(숫자, 대문자, - . 공백 $ / + %) */
export function canEncodeCode39(value: string): boolean {
	return value.length > 0 && [...value].every((char) => char !== "*" && Object.hasOwn(PATTERNS, char));
}

export interface BarRect {
	/** 왼쪽 끝(픽셀). 여백 포함 */
	x: number;
	width: number;
}

export interface Code39Layout {
	bars: BarRect[];
	/** 여백까지 합한 전체 폭(픽셀) */
	width: number;
	narrow: number;
	wide: number;
}

/**
 * 주어진 폭 안에서 가장 크게 그린 바코드 막대 위치.
 * 좁은 칸과 넓은 칸을 정수 픽셀로 맞춰야 막대 가장자리가 번지지 않는다.
 * 좁은 칸을 먼저 가장 크게 고르고(멀리서도 읽히게), 그다음 넓은 칸을 3배에 가깝게 고른다. 1픽셀로도 안 들어가면 null이다.
 */
export function layoutCode39(value: string, maxWidthPx: number): Code39Layout | null {
	if (!canEncodeCode39(value)) throw new Error("Code 39로 그릴 수 없는 값이에요.");
	const patterns = [...`*${value}*`].map((char) => PATTERNS[char]);
	// 글자마다 좁은 칸 6개·넓은 칸 3개, 글자 사이마다 좁은 빈칸 1개, 앞뒤 여백
	const narrowCount = patterns.length * 6 + (patterns.length - 1) + QUIET_NARROW * 2;
	const wideCount = patterns.length * 3;
	const fits = (narrow: number, wide: number) => narrow * narrowCount + wide * wideCount <= maxWidthPx;

	for (let narrow = Math.floor(maxWidthPx / (narrowCount + wideCount * MIN_RATIO)); narrow >= 1; narrow -= 1) {
		for (let wide = narrow * MAX_RATIO; wide >= Math.ceil(narrow * MIN_RATIO); wide -= 1) {
			if (fits(narrow, wide)) return placeBars(patterns, narrow, wide);
		}
	}
	return null;
}

function placeBars(patterns: string[], narrow: number, wide: number): Code39Layout {
	const bars: BarRect[] = [];
	let x = QUIET_NARROW * narrow;
	patterns.forEach((pattern, index) => {
		if (index > 0) x += narrow;
		[...pattern].forEach((kind, element) => {
			const width = kind === "w" ? wide : narrow;
			if (element % 2 === 0) bars.push({ x, width });
			x += width;
		});
	});
	return { bars, width: x + QUIET_NARROW * narrow, narrow, wide };
}
