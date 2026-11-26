import { describe, expect, it } from 'vitest';
import { shouldPollCharge, toViewModel } from './charge';
import type { CurrentSeatDto } from './types';

const base: CurrentSeatDto = {
	id: 1,
	roomName: '제1열람실-2',
	seatCode: '471',
	stateName: '임시배정',
	beginTime: '2026-09-09 23:55:00',
	endTime: '2026-09-10 03:55:00',
	isCheckinable: true,
	checkinExpiryDate: '2026-09-10 00:05:00',
	arrivalConfirmMethods: ['GATE'],
	isReturnable: false,
	isRenewable: false,
	renewableDate: null,
	isGateOut: false
};

describe('toViewModel', () => {
	it('게이트 입실 대기 안내', () => {
		const vm = toViewModel(base);
		expect(vm.canCheckIn).toBe(true);
		expect(vm.usesGateConfirmation).toBe(true);
		expect(vm.checkinDeadlineLabel).toBe('00:05');
		expect(vm.beginTimeLabel).toBe('23:55');
	});
});

describe('shouldPollCharge', () => {
	it('입실 대기가 아니면 폴링하지 않음', () => {
		expect(shouldPollCharge({ ...base, isCheckinable: false })).toBe(false);
		expect(shouldPollCharge(null)).toBe(false);
	});
	it('만료 시각이 지났으면 폴링하지 않음', () => {
		expect(shouldPollCharge(base)).toBe(false); // 2026-09-10 은 이미 과거 시점
		expect(shouldPollCharge({ ...base, checkinExpiryDate: '2999-01-01 00:00:00' })).toBe(true);
	});
});
