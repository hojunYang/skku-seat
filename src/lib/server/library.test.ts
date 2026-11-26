import { expect, it, vi } from 'vitest';
import { requestPyxis } from './http';
import { getLibrary } from './library';

vi.mock('./config', () => ({ USE_MOCK_API: false }));
vi.mock('./http', () => ({ requestPyxis: vi.fn() }));

it('fetches the signed-in account’s entry barcode from the science member endpoint', async () => {
	vi.mocked(requestPyxis).mockResolvedValueOnce({
		success: true,
		code: 'success.retrieved',
		message: '',
		data: { printMemberNo: ' DEMO ', name: 'Ignored' }
	});

	await expect(getLibrary('test-token').getEntryPass()).resolves.toBe('DEMO');
	expect(requestPyxis).toHaveBeenCalledWith('/pyxis-api/2/api/my-info/edit', 'test-token');
});

it('reports a masked member number without attempting to generate an entry barcode', async () => {
	vi.mocked(requestPyxis).mockResolvedValueOnce({
		success: true,
		code: 'success.retrieved',
		message: '',
		data: { printMemberNo: '**********00' }
	});

	await expect(getLibrary('test-token').getEntryPass()).rejects.toMatchObject({ kind: 'unsupported' });
});
