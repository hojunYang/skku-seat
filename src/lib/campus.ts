export const CAMPUSES = {
	humanities: { apiNamespace: 1, branchGroupId: 1, label: '인문사회과학캠퍼스' },
	science: { apiNamespace: 2, branchGroupId: 2, label: '자연과학캠퍼스' }
} as const;

export type CampusId = keyof typeof CAMPUSES;

export const DEFAULT_CAMPUS: CampusId = 'humanities';

export function isCampusId(value: string | null | undefined): value is CampusId {
	return value === 'humanities' || value === 'science';
}

export function parseCampus(value: string | null | undefined): CampusId {
	return isCampusId(value) ? value : DEFAULT_CAMPUS;
}

export function campusApiRoot(campus: CampusId): string {
	return `/pyxis-api/${CAMPUSES[campus].apiNamespace}`;
}
