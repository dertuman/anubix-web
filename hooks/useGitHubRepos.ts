'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export interface GitHubRepo {
  name: string;
  full_name: string;
  private: boolean;
  clone_url: string;
  updated_at: string;
}

export function useGitHubRepos(enabled: boolean = true) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchRepos = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/github/repos');
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[useGitHubRepos] Failed to fetch repos:', res.status, error);
        return;
      }
      const data = await res.json();
      if (data.repos) {
        setRepos(data.repos);
      }
    } catch (err) {
      console.error('[useGitHubRepos] Exception while fetching repos:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      fetchRepos();
    }
  }, [enabled, fetchRepos]);

  const filteredRepos = useMemo(() => {
    if (!search.trim()) return repos;
    const q = search.toLowerCase();
    return repos.filter((r) => r.full_name.toLowerCase().includes(q));
  }, [repos, search]);

  return {
    repos,
    isLoading,
    search,
    setSearch,
    filteredRepos,
    refresh: fetchRepos,
  };
}
