import type { CurrentSeatDto } from './types';
import { formatPyxisTime, isPyxisDateTimePast } from './date';

export interface CurrentSeatViewModel {
	roomName: string;
	seatCode: string;
	statusLabel: string;
	beginTimeLabel: string;
	endTimeLabel: string;
	checkinDeadlineLabel?: string;
	renewalAvailableFromLabel?: string;
	canCheckIn: boolean;
	canCancelReservation: boolean;
	canRenew: boolean;
	canReturn: boolean;
	isGateOut: boolean;
	usesGateConfirmation: boolean;
}

export function toViewModel(charge: CurrentSeatDto): CurrentSeatViewModel {
	return {
		roomName: charge.roomName,
		seatCode: charge.seatCode,
		statusLabel: charge.stateName,
		beginTimeLabel: formatPyxisTime(charge.beginTime) ?? '시간 확인 필요',
		endTimeLabel: formatPyxisTime(charge.endTime) ?? '시간 확인 필요',
		checkinDeadlineLabel: formatPyxisTime(charge.checkinExpiryDate),
		renewalAvailableFromLabel: formatPyxisTime(charge.renewableDate),
		canCheckIn: charge.isCheckinable,
		canCancelReservation: charge.isCheckinable,
		canRenew: charge.isRenewable,
		canReturn: charge.isReturnable,
		isGateOut: charge.isGateOut,
		usesGateConfirmation: charge.arrivalConfirmMethods.includes('GATE')
	};
}

/** 입실 대기 중이고 아직 만료되지 않은 경우에만 폴링합니다. */
export function shouldPollCharge(charge: CurrentSeatDto | null | undefined): boolean {
	if (!charge?.isCheckinable) return false;
	return !charge.checkinExpiryDate || !isPyxisDateTimePast(charge.checkinExpiryDate);
}
