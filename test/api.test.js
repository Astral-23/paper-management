import { describe, it, expect, vi, afterEach } from 'vitest';
import { extractArxivId, fetchPaperDataByArxivId, searchAndFetchPaperDataByQuery } from '../js/api.js';

// グローバルなfetchをモック
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
    vi.clearAllMocks();
});

describe('extractArxivId', () => {
    it('標準的なarXiv IDを抽出できる', () => {
        const query = 'https://arxiv.org/abs/2109.12345';
        expect(extractArxivId(query)).toBe('2109.12345');
    });

    it('バージョン番号付きのarXiv IDを抽出できる', () => {
        const query = 'https://arxiv.org/pdf/2109.12345v2.pdf';
        expect(extractArxivId(query)).toBe('2109.12345v2');
    });

    it('古い形式のarXiv IDを抽出できる', () => {
        const query = 'https://arxiv.org/abs/cs/0112017';
        expect(extractArxivId(query)).toBe('cs/0112017');
    });

    it('URLの途中にIDが含まれている場合でも抽出できる', () => {
        const query = 'some text before https://arxiv.org/abs/2201.00001 and after';
        expect(extractArxivId(query)).toBe('2201.00001');
    });

    it('IDのみが与えられた場合に抽出できる', () => {
        const query = '2305.05678';
        expect(extractArxivId(query)).toBe('2305.05678');
    });

    it('.pdfで終わるIDを正しく処理できる', () => {
        const query = '2109.12345.pdf';
        expect(extractArxivId(query)).toBe('2109.12345');
    });

    it('arXiv IDが含まれない場合はnullを返す', () => {
        const query = 'https://example.com';
        expect(extractArxivId(query)).toBe(null);
    });

    it('空の文字列の場合はnullを返す', () => {
        const query = '';
        expect(extractArxivId(query)).toBe(null);
    });
});

describe('fetchPaperDataByArxivId', () => {
    it('成功した場合、論文データを返す', async () => {
        const mockPaper = { title: 'Test Paper', year: 2024 };
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockPaper),
        });

        const data = await fetchPaperDataByArxivId('2401.00001');

        expect(mockFetch).toHaveBeenCalledWith('https://api.semanticscholar.org/graph/v1/paper/ARXIV:2401.00001?fields=title,year,authors,citationCount,url');
        expect(data).toEqual(mockPaper);
    });

    it('APIがエラーを返した場合、nullを返す', async () => {
        mockFetch.mockResolvedValue({ ok: false, statusText: 'Not Found' });

        const data = await fetchPaperDataByArxivId('invalid-id');

        expect(data).toBe(null);
    });

    it('fetchが失敗した場合、nullを返す', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const data = await fetchPaperDataByArxivId('any-id');

        expect(data).toBe(null);
    });
});

describe('searchAndFetchPaperDataByQuery', () => {
    it('成功して結果が見つかった場合、最初の論文データを返す', async () => {
        const mockPaper = { title: 'Found Paper', year: 2023 };
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ total: 1, data: [mockPaper] }),
        });

        const data = await searchAndFetchPaperDataByQuery('some query');

        expect(mockFetch).toHaveBeenCalledWith('https://api.semanticscholar.org/graph/v1/paper/search?query=some%20query&limit=1&fields=title,year,authors,citationCount,url');
        expect(data).toEqual(mockPaper);
    });

    it('結果が見つからなかった場合、nullを返す', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ total: 0, data: [] }),
        });

        const data = await searchAndFetchPaperDataByQuery('no-result-query');

        expect(data).toBe(null);
    });

    it('APIがエラーを返した場合、nullを返す', async () => {
        mockFetch.mockResolvedValue({ ok: false, statusText: 'Bad Request' });

        const data = await searchAndFetchPaperDataByQuery('error-query');

        expect(data).toBe(null);
    });

    it('fetchが失敗した場合、nullを返す', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const data = await searchAndFetchPaperDataByQuery('any-query');

        expect(data).toBe(null);
    });
});
