import lunr from 'lunr';
import type { VaultNote, SearchResult } from './types.js';
import { extractSnippet } from './frontmatter.js';

export interface SearchIndex {
  search(query: string, topK?: number): SearchResult[];
}

export function buildIndex(notes: VaultNote[]): SearchIndex {
  const noteMap = new Map<string, VaultNote>(notes.map((n) => [n.path, n]));

  const idx = lunr(function () {
    this.ref('path');
    this.field('title', { boost: 10 });
    this.field('content');

    for (const note of notes) {
      this.add({ path: note.path, title: note.title, content: note.content });
    }
  });

  return {
    search(query: string, topK = 5): SearchResult[] {
      let raw: lunr.Index.Result[];
      try {
        raw = idx.search(query);
      } catch {
        raw = [];
      }

      return raw.slice(0, topK).flatMap((r) => {
        const note = noteMap.get(r.ref);
        if (!note) return [];
        const source_url =
          typeof note.frontmatter['source_url'] === 'string'
            ? note.frontmatter['source_url']
            : undefined;
        return [
          {
            path: note.path,
            title: note.title,
            snippet: extractSnippet(note.content),
            source_url,
            score: r.score,
          },
        ];
      });
    },
  };
}
