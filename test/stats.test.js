import { describe, it, expect } from 'vitest';
import { calculateMaxStreak, calculateTopCategory, calculateTopAuthors } from '../js/stats.js';

// toDateを模倣したシンプルなDateオブジェクトを返す関数
const mockToDate = (dateStr) => ({
    toDate: () => new Date(dateStr)
});

describe('calculateMaxStreak', () => {
    it('空の配列の場合は0を返す', () => {
        const papers = [];
        expect(calculateMaxStreak(papers)).toBe(0);
    });

    it('論文が1つの場合は1を返す', () => {
        const papers = [{ readAt: mockToDate('2024-01-01') }];
        expect(calculateMaxStreak(papers)).toBe(1);
    });

    it('3日連続で読んだ場合は3を返す', () => {
        const papers = [
            { readAt: mockToDate('2024-01-01') },
            { readAt: mockToDate('2024-01-02') },
            { readAt: mockToDate('2024-01-03') },
        ];
        expect(calculateMaxStreak(papers)).toBe(3);
    });

    it('日付が飛んでいる場合は最長のストリークを返す', () => {
        const papers = [
            { readAt: mockToDate('2024-01-01') },
            { readAt: mockToDate('2024-01-02') }, // streak of 2
            { readAt: mockToDate('2024-01-05') },
            { readAt: mockToDate('2024-01-06') },
            { readAt: mockToDate('2024-01-07') }, // streak of 3
        ];
        expect(calculateMaxStreak(papers)).toBe(3);
    });
});

describe('calculateTopCategory', () => {
    it('空の配列の場合はN/Aを返す', () => {
        const papers = [];
        expect(calculateTopCategory(papers)).toEqual({ name: 'N/A', count: 0 });
    });

    it('最も多いカテゴリを正しく計算する', () => {
        const papers = [
            { category: 'ML' },
            { category: 'ML' },
            { category: 'CV' },
        ];
        expect(calculateTopCategory(papers)).toEqual({ name: 'ML', count: 2 });
    });

    it('カテゴリが未分類の場合も考慮する', () => {
        const papers = [
            { category: 'ML' },
            { /* no category */ },
            { /* no category */ },
        ];
        expect(calculateTopCategory(papers)).toEqual({ name: '未分類', count: 2 });
    });
});

describe('calculateTopAuthors', () => {
    it('空の配列の場合は空の配列を返す', () => {
        const papers = [];
        expect(calculateTopAuthors(papers)).toEqual([]);
    });

    it('著者ごとに論文数を正しく集計して降順にソートする', () => {
        const papers = [
            { authors: [{ name: 'Author A' }], category: 'ML' },
            { authors: [{ name: 'Author B' }], category: 'CV' },
            { authors: [{ name: 'Author A' }], category: 'ML' },
        ];
        const expected = [
            { name: 'Author A', count: 2, topCategory: 'ML' },
            { name: 'Author B', count: 1, topCategory: 'CV' },
        ];
        expect(calculateTopAuthors(papers)).toEqual(expected);
    });

    it('1つの論文に複数の著者がいる場合も正しく集計する', () => {
        const papers = [
            { authors: [{ name: 'Author A' }, { name: 'Author B' }], category: 'ML' },
            { authors: [{ name: 'Author A' }], category: 'CV' },
        ];
        const result = calculateTopAuthors(papers);
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Author A');
        expect(result[0].count).toBe(2);
        expect(['ML', 'CV']).toContain(result[0].topCategory);
        expect(result[1].name).toBe('Author B');
        expect(result[1].count).toBe(1);
        expect(result[1].topCategory).toBe('ML');
    });

    it('limitパラメータに従って結果を制限する', () => {
        const papers = [
            { authors: [{ name: 'Author A' }] },
            { authors: [{ name: 'Author B' }] },
            { authors: [{ name: 'Author C' }] },
        ];
        expect(calculateTopAuthors(papers, 2)).toHaveLength(2);
    });
});
