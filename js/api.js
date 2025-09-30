const ARXIV_ID_REGEX = /(\d{4}\.\d{4,5}(v\d+)?|[a-zA-Z-]+(?:\.[a-zA-Z-]+)?\/\d{7})/;

export async function fetchPaperDataByArxivId(paperId) {
    const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/ARXIV:${paperId}?fields=title,year,authors,citationCount,url`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch paper data by ArXiv ID:', error);
        return null;
    }
}

export async function searchAndFetchPaperDataByQuery(query) {
    const searchApiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=1&fields=title,year,authors,citationCount,url`;
    try {
        const response = await fetch(searchApiUrl);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const result = await response.json();
        if (result.total > 0 && result.data.length > 0) { return result.data[0]; }
        return null;
    } catch (error) {
        console.error('Failed to search paper data:', error);
        return null;
    }
}

export function extractArxivId(query) {
    const match = query.match(ARXIV_ID_REGEX);
    return match ? match[0].replace('.pdf', '') : null;
}
