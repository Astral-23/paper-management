import { describe, it, expect } from 'vitest';
import {
  MAX_PAPERS_PER_PAGE,
  MAX_TAGS_TO_DISPLAY,
  MAX_AUTHORS_TO_DISPLAY,
  MAX_TITLE_LENGTH,
} from '../js/config.js';

describe('config.js', () => {
  it('MAX_PAPERS_PER_PAGEの値が正しい', () => {
    expect(MAX_PAPERS_PER_PAGE).toBe(50);
  });

  it('MAX_TAGS_TO_DISPLAYの値が正しい', () => {
    expect(MAX_TAGS_TO_DISPLAY).toBe(5);
  });

  it('MAX_AUTHORS_TO_DISPLAYの値が正しい', () => {
    expect(MAX_AUTHORS_TO_DISPLAY).toBe(3);
  });

  it('MAX_TITLE_LENGTHの値が正しい', () => {
    expect(MAX_TITLE_LENGTH).toBe(150);
  });
});
