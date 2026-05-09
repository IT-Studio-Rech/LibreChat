import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import chokidar from 'chokidar';
import { simpleGit } from 'simple-git';
import type { SimpleGit } from 'simple-git';
import { parseNote } from './frontmatter.js';
import { buildIndex } from './search.js';
import type { VaultNote, ListEntry, NotePayload, VaultConfig, SearchResult } from './types.js';
import type { SearchIndex } from './search.js';

export class VaultLoader {
  private readonly config: VaultConfig;
  private readonly repoUrl: string;
  private notes = new Map<string, VaultNote>();
  private index: SearchIndex = { search: () => [] };
  private ready = false;

  constructor(config: VaultConfig) {
    this.config = config;
    const { githubToken, repoOwner, repoName } = config;
    this.repoUrl = `https://${githubToken}@github.com/${repoOwner}/${repoName}.git`;
  }

  async init(): Promise<void> {
    await this.cloneOrPull();
    this.ready = true;
    this.watchFiles();
    setInterval(() => void this.cloneOrPull(), this.config.pullIntervalMs);
  }

  private get wikiDir(): string {
    return path.join(this.config.cacheDir, 'wiki');
  }

  private async cloneOrPull(): Promise<void> {
    const { cacheDir } = this.config;
    const git: SimpleGit = simpleGit();

    if (!existsSync(cacheDir)) {
      await git.clone(this.repoUrl, cacheDir);
    } else {
      const repoGit: SimpleGit = simpleGit(cacheDir);
      await repoGit.pull();
    }

    await this.reindex();
  }

  private async reindex(): Promise<void> {
    const found = await this.collectMarkdownFiles(this.wikiDir);
    this.notes.clear();

    await Promise.all(
      found.map(async (absPath) => {
        const rel = path.relative(this.config.cacheDir, absPath).replace(/\\/g, '/');
        const raw = await fs.readFile(absPath, 'utf-8');
        const filename = path.basename(absPath, '.md');
        const parsed = parseNote(raw, filename);
        this.notes.set(rel, {
          path: rel,
          title: parsed.title,
          content: parsed.content,
          frontmatter: parsed.frontmatter,
        });
      }),
    );

    this.index = buildIndex([...this.notes.values()]);
  }

  private async collectMarkdownFiles(dir: string): Promise<string[]> {
    if (!existsSync(dir)) return [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const results: string[] = [];

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await this.collectMarkdownFiles(full)));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(full);
      }
    }

    return results;
  }

  private watchFiles(): void {
    if (!existsSync(this.wikiDir)) return;

    chokidar
      .watch(this.wikiDir, { ignoreInitial: true, persistent: true })
      .on('all', () => void this.reindex());
  }

  search(query: string, topK = 5): SearchResult[] {
    this.assertReady();
    return this.index.search(query, topK);
  }

  getNote(notePath: string): NotePayload | null {
    this.assertReady();
    const note = this.notes.get(notePath);
    if (!note) return null;
    return { content: note.content, frontmatter: note.frontmatter };
  }

  listNotes(folder?: string): ListEntry[] {
    this.assertReady();
    const all = [...this.notes.values()];
    const filtered = folder
      ? all.filter((n) => n.path.startsWith(folder.replace(/\\/g, '/')))
      : all;
    return filtered.map((n) => ({ path: n.path, title: n.title }));
  }

  private assertReady(): void {
    if (!this.ready) {
      throw new Error('VaultLoader is not yet initialized — call init() first');
    }
  }
}
