import matter from 'gray-matter';

export interface ParsedNote {
  content: string;
  frontmatter: Record<string, unknown>;
  title: string;
  source_url?: string;
}

export function parseNote(raw: string, fallbackTitle: string): ParsedNote {
  const { content, data } = matter(raw);
  const frontmatter = data as Record<string, unknown>;

  const title =
    typeof frontmatter['title'] === 'string' ? frontmatter['title'] : fallbackTitle;

  const source_url =
    typeof frontmatter['source_url'] === 'string' ? frontmatter['source_url'] : undefined;

  return { content, frontmatter, title, source_url };
}

export function extractSnippet(content: string, maxLen = 200): string {
  return content.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}
