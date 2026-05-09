export interface VaultNote {
  /** Relative path from vault root, e.g. "wiki/01-nischenfindung/intro.md" */
  path: string;
  title: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

export interface SearchResult {
  path: string;
  title: string;
  /** First ~200 chars of content, trimmed */
  snippet: string;
  /** Extracted from frontmatter.source_url — original web source if any */
  source_url?: string;
  score: number;
}

export interface NotePayload {
  content: string;
  frontmatter: Record<string, unknown>;
}

export interface ListEntry {
  path: string;
  title: string;
}

export interface VaultConfig {
  repoOwner: string;
  repoName: string;
  githubToken: string;
  /** Absolute path where the vault repo is cloned */
  cacheDir: string;
  /** Pull interval in ms — default 600 000 (10 min) */
  pullIntervalMs: number;
}
