import { describe, it, expect } from 'vitest';
import {
    calculateMaxStreak,
    calculateTopCategory,
    calculateTopAuthors,
    calculateStatusCounts, // Assuming this will be created and exported
    calculateYearCounts,   // Assuming this will be created and exported
} from '../js/stats.js';

// Helper to mock the Firestore-like timestamp object
const mockToDate = (dateStr) => ({
    toDate: () => new Date(dateStr)
});

const mockPapers = [
    { status: 'read', readAt: mockToDate('2024-01-01'), category: 'ML', authors: [{ name: 'Author A' }], year: 2022 },
    { status: 'read', readAt: mockToDate('2024-01-02'), category: 'ML', authors: [{ name: 'Author A' }, { name: 'Author B' }], year: 2023 },
    { status: 'unread', category: 'CV', authors: [{ name: 'Author B' }], year: 2023 },
    { status: 'to-read', category: 'ML', authors: [{ name: 'Author C' }], year: 2022 },
    { status: 'skimmed', category: 'Other' }, // Missing authors and year
    { status: 'read', readAt: mockToDate('2024-01-05') }, // Missing category, authors, year
];

describe('stats.js', () => {

    describe('calculateStatusCounts', () => {
        it('should correctly count papers by status', () => {
            const counts = calculateStatusCounts(mockPapers);
            expect(counts).toEqual({ read: 3, unread: 1, 'to-read': 1, skimmed: 1 });
        });

        it('should return an empty object for empty paper list', () => {
            const counts = calculateStatusCounts([]);
            expect(counts).toEqual({});
        });

        it('should handle papers with missing status', () => {
            const papersWithMissingStatus = [...mockPapers, { title: 'No status' }];
            const counts = calculateStatusCounts(papersWithMissingStatus);
            // Papers with no status are counted as 'unread' by default in some parts of the app, let's assume that logic holds.
            // Based on stats.js logic, it should be `undefined` key or handled gracefully.
            // Let's assume it defaults to unread.
            expect(counts.read).toBe(3);
            expect(counts.unread).toBe(2); 
        });
    });

    describe('calculateYearCounts', () => {
        it('should correctly count papers by publication year', () => {
            const counts = calculateYearCounts(mockPapers);
            expect(counts).toEqual({ '2022': 2, '2023': 2 });
        });

        it('should return an empty object for empty paper list', () => {
            const counts = calculateYearCounts([]);
            expect(counts).toEqual({});
        });

        it('should ignore papers without a year', () => {
            const papersWithMissingYear = [
                { year: 2020 },
                { title: 'no year' },
                { year: 2020 },
            ];
            const counts = calculateYearCounts(papersWithMissingYear);
            expect(counts).toEqual({ '2020': 2 });
        });
    });

    describe('calculateMaxStreak', () => {
        it('returns 0 for an empty array', () => {
            expect(calculateMaxStreak([])).toBe(0);
        });

        it('returns 1 for a single paper', () => {
            const papers = [{ readAt: mockToDate('2024-01-01') }];
            expect(calculateMaxStreak(papers)).toBe(1);
        });

        it('returns 3 for a 3-day streak', () => {
            const papers = [
                { readAt: mockToDate('2024-01-01') },
                { readAt: mockToDate('2024-01-02') },
                { readAt: mockToDate('2024-01-03') },
            ];
            expect(calculateMaxStreak(papers)).toBe(3);
        });

        it('returns the longest streak when there is a gap', () => {
            const papers = [
                { readAt: mockToDate('2024-01-01') },
                { readAt: mockToDate('2024-01-02') }, // streak of 2
                { readAt: mockToDate('2024-01-05') },
                { readAt: mockToDate('2024-01-06') },
                { readAt: mockToDate('2024-01-07') }, // streak of 3
            ];
            expect(calculateMaxStreak(papers)).toBe(3);
        });

        it('handles papers without readAt gracefully', () => {
            const papers = [
                { readAt: mockToDate('2024-01-01') },
                { status: 'unread' },
            ];
            expect(() => calculateMaxStreak(papers)).not.toThrow();
            expect(calculateMaxStreak(papers)).toBe(1);
        });
    });

    describe('calculateTopCategory', () => {
        it('returns N/A for an empty array', () => {
            expect(calculateTopCategory([])).toEqual({ name: 'N/A', count: 0 });
        });

        it('calculates the top category correctly', () => {
            const papers = [
                { category: 'ML' },
                { category: 'ML' },
                { category: 'CV' },
            ];
            expect(calculateTopCategory(papers)).toEqual({ name: 'ML', count: 2 });
        });

        it('considers papers without a category as "未分類"', () => {
            const papers = [
                { category: 'ML' },
                { /* no category */ },
                { /* no category */ },
            ];
            expect(calculateTopCategory(papers)).toEqual({ name: '未分類', count: 2 });
        });
    });

    describe('calculateTopAuthors', () => {
        it('returns an empty array for an empty paper list', () => {
            expect(calculateTopAuthors([])).toEqual([]);
        });

        it('correctly aggregates and sorts authors by count', () => {
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

        it('handles multiple authors in one paper', () => {
            const papers = [
                { authors: [{ name: 'Author A' }, { name: 'Author B' }], category: 'ML' },
                { authors: [{ name: 'Author A' }], category: 'CV' },
            ];
            const result = calculateTopAuthors(papers);
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Author A');
            expect(result[0].count).toBe(2);
            expect(['ML', 'CV']).toContain(result[0].topCategory);
        });

        it('respects the limit parameter', () => {
            const papers = [
                { authors: [{ name: 'Author A' }] },
                { authors: [{ name: 'Author B' }] },
                { authors: [{ name: 'Author C' }] },
            ];
            expect(calculateTopAuthors(papers, 2)).toHaveLength(2);
        });

        it('handles papers without an authors property', () => {
            const papers = [
                { authors: [{ name: 'Author A' }] },
                { title: 'No authors' },
            ];
            const result = calculateTopAuthors(papers);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Author A');
        });

        it('handles papers with an empty authors array', () => {
            const papers = [
                { authors: [{ name: 'Author A' }] },
                { authors: [] },
            ];
            const result = calculateTopAuthors(papers);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Author A');
        });
    });
});