import { NextRequest } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative } from 'path';

import { isAppConfigured } from '@/lib/setup/config';

/**
 * Push the entire project to a new GitHub repository using the GitHub REST API.
 * Streams progress via Server-Sent Events (SSE) so the frontend can show a progress bar.
 *
 * Event types:
 *   { step: "creating_repo" }
 *   { step: "waiting_for_repo" }
 *   { step: "reading_files", total: number }
 *   { step: "uploading", current: number, total: number, file: string }
 *   { step: "finalizing" }
 *   { step: "done", repoUrl, owner, repoName }
 *   { step: "error", error: string }
 */

const IGNORE_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  '.env',
  '.env.local',
  'dist',
  '.turbo',
  '.vercel',
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(
    (pattern) =>
      filePath.includes(`/${pattern}/`) ||
      filePath.includes(`\\${pattern}\\`) ||
      filePath.endsWith(`/${pattern}`) ||
      filePath.endsWith(`\\${pattern}`) ||
      filePath === pattern
  );
}

async function getAllFiles(
  dir: string,
  baseDir: string
): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath).replace(/\\/g, '/');

    if (shouldIgnore(relativePath) || entry.name.startsWith('.env')) continue;

    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else {
      try {
        const fileStat = await stat(fullPath);
        if (fileStat.size > 1_000_000) continue;
        const content = await readFile(fullPath, 'base64');
        files.push({ path: relativePath, content });
      } catch {
        // Skip unreadable files
      }
    }
  }

  return files;
}

async function githubApi(
  endpoint: string,
  token: string,
  options: RequestInit = {}
) {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = data.message || `GitHub API error: ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

async function waitForRepoReady(
  owner: string,
  repoName: string,
  token: string
): Promise<string> {
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const branch = await githubApi(
        `/repos/${owner}/${repoName}/branches/main`,
        token
      );
      if (branch?.commit?.sha) {
        return branch.commit.sha;
      }
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(
    'GitHub is taking too long to initialize the repository. Please try again.'
  );
}

export async function POST(req: NextRequest) {
  // Parse body upfront (can't read body after starting the stream)
  const body = await req.json();
  const { githubToken, repoName, isPrivate = true } = body;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        if (isAppConfigured()) {
          send({ step: 'error', error: 'App is already configured' });
          controller.close();
          return;
        }

        if (!githubToken || !repoName) {
          send({
            step: 'error',
            error: 'GitHub token and repository name are required',
          });
          controller.close();
          return;
        }

        // 1. Get authenticated user
        const user = await githubApi('/user', githubToken);
        const owner = user.login;

        // 2. Create repo
        send({ step: 'creating_repo' });

        let repoUrl = '';

        try {
          const repo = await githubApi('/user/repos', githubToken, {
            method: 'POST',
            body: JSON.stringify({
              name: repoName,
              private: isPrivate,
              auto_init: true,
            }),
          });
          repoUrl = repo.html_url;
        } catch (error: any) {
          if (error.message?.includes('name already exists')) {
            try {
              const existing = await githubApi(
                `/repos/${owner}/${repoName}`,
                githubToken
              );

              try {
                const commits = await githubApi(
                  `/repos/${owner}/${repoName}/commits?per_page=3`,
                  githubToken
                );
                if (Array.isArray(commits) && commits.length > 2) {
                  send({
                    step: 'error',
                    error: `Repository "${repoName}" already exists and contains code. Choose a different name.`,
                  });
                  controller.close();
                  return;
                }
              } catch {
                // 409 = empty repo — safe to reuse
              }

              repoUrl = existing.html_url;
            } catch {
              send({
                step: 'error',
                error: `Repository "${repoName}" already exists. Choose a different name.`,
              });
              controller.close();
              return;
            }
          } else {
            throw error;
          }
        }

        // 3. Wait for repo to be ready
        send({ step: 'waiting_for_repo' });
        const latestCommitSha = await waitForRepoReady(
          owner,
          repoName,
          githubToken
        );

        // 4. Read all project files
        const projectDir = process.cwd();
        const files = await getAllFiles(projectDir, projectDir);

        if (files.length === 0) {
          send({ step: 'error', error: 'No files found to push' });
          controller.close();
          return;
        }

        send({ step: 'reading_files', total: files.length });

        // 5. Create blobs for each file (this is the slow part — stream progress)
        const treeItems: {
          path: string;
          mode: string;
          type: string;
          sha: string;
        }[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          send({
            step: 'uploading',
            current: i + 1,
            total: files.length,
            file: file.path,
          });

          const blob = await githubApi(
            `/repos/${owner}/${repoName}/git/blobs`,
            githubToken,
            {
              method: 'POST',
              body: JSON.stringify({
                content: file.content,
                encoding: 'base64',
              }),
            }
          );

          treeItems.push({
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: blob.sha,
          });
        }

        // 6. Create tree, commit, update ref
        send({ step: 'finalizing' });

        const tree = await githubApi(
          `/repos/${owner}/${repoName}/git/trees`,
          githubToken,
          {
            method: 'POST',
            body: JSON.stringify({ tree: treeItems }),
          }
        );

        const commit = await githubApi(
          `/repos/${owner}/${repoName}/git/commits`,
          githubToken,
          {
            method: 'POST',
            body: JSON.stringify({
              message: 'Initial commit from setup wizard',
              tree: tree.sha,
              parents: [latestCommitSha],
            }),
          }
        );

        await githubApi(
          `/repos/${owner}/${repoName}/git/refs/heads/main`,
          githubToken,
          {
            method: 'PATCH',
            body: JSON.stringify({ sha: commit.sha, force: true }),
          }
        );

        // Done!
        send({
          step: 'done',
          repoUrl,
          owner,
          repoName,
        });
      } catch (error: any) {
        const msg = error.message?.includes('Bad credentials')
          ? 'Invalid GitHub token. Make sure you followed the token creation steps above.'
          : error.message || 'Failed to push to GitHub';

        send({ step: 'error', error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
