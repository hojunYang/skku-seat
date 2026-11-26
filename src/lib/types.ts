/** 서버가 클라이언트로 내려주는 최소 DTO. patron 정보 등 불필요한 값은 포함하지 않습니다. */

export interface RoomDto {
	id: number;
	name: string;
	floor: number;
	isChargeable: boolean;
	unableMessage: string | null;
	branchAlias: string;
	available: number;
	total: number;
}

export interface RoomDetailDto {
	name: string;
	attention: string | null;
	/** 예: "06:00 ~ 익일 05:00" */
	period: string | null;
}

export interface SeatSummary {
	/** API 내부 식별자. 좌석 배정 요청에 사용 */
	id: number;
	/** 화면에 보이는 좌석 번호. API 식별자로 쓰지 마세요. */
	code: string;
	isOccupied?: boolean;
}

export interface SeatDetailDto {
	id: number;
	code: string;
	isOccupied: boolean;
	seatTypeName: string;
	defaultUseTime: number;
}

export interface CurrentSeatDto {
	id: number;
	roomName: string;
	seatCode: string;
	stateName: string;
	beginTime: string;
	endTime: string;
	isCheckinable: boolean;
	checkinExpiryDate: string | null;
	arrivalConfirmMethods: string[];
	isReturnable: boolean;
	isRenewable: boolean;
	renewableDate: string | null;
	isGateOut: boolean;
}

/** 열람실 페이지에서 한 구역(열람실 하나)의 좌석 묶음 */
export interface RoomSection {
	roomId: number;
	/** 묶음일 때 구역 번호("1", "2" …), 단독이면 빈 문자열 */
	label: string;
	/** 열람실 이름 뒤 괄호 설명(예: "노트북"), 없으면 빈 문자열 */
	note: string;
	name: string;
	available: number;
	total: number;
	isChargeable: boolean;
	seats: SeatSummary[];
	seatsError: string | null;
}
