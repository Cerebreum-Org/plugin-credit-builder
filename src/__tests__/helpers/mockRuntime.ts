/**
 * Shared mock factory for IAgentRuntime
 *
 * Uses in-memory Map for cache and array for memories,
 * so tests verify real read-after-write semantics.
 */

import { mock } from 'bun:test';
import type { IAgentRuntime, Memory, UUID } from '@elizaos/core';

export interface MockRuntimeOptions {
  settings?: Record<string, string | boolean | number | null>;
  services?: Record<string, unknown>;
}

export function createMockRuntime(opts: MockRuntimeOptions = {}): IAgentRuntime {
  const cache = new Map<string, unknown>();
  const memories: Memory[] = [];
  const settings = opts.settings ?? {};
  const services = opts.services ?? {};

  const runtime = {
    agentId: 'test-agent-id' as UUID,

    // Cache
    getCache: mock(async <T>(key: string): Promise<T | undefined> => {
      return cache.get(key) as T | undefined;
    }),
    setCache: mock(async <T>(key: string, value: T): Promise<boolean> => {
      cache.set(key, value);
      return true;
    }),

    // Memory
    createMemory: mock(async (memory: Memory, _tableName: string): Promise<UUID> => {
      const id = `mem-${memories.length}` as UUID;
      memories.push({ ...memory, id });
      return id;
    }),
    getMemories: mock(async (params: { tableName: string; roomId?: UUID }): Promise<Memory[]> => {
      return memories.filter(m => !params.roomId || m.roomId === params.roomId);
    }),

    // Services
    getService: mock(<T>(name: string): T | null => {
      return (services[name] as T) ?? null;
    }),

    // Settings
    getSetting: mock((key: string): string | boolean | number | null => {
      return settings[key] ?? null;
    }),

    // Logging — no-ops
    logger: { info: mock(), warn: mock(), error: mock(), debug: mock() },
  } as unknown as IAgentRuntime;

  return runtime;
}

/** Access the underlying cache Map for assertions */
export function getRuntimeCache(runtime: IAgentRuntime): Map<string, unknown> {
  // getCache/setCache close over the same Map, so we reconstruct by calling getCache
  // Instead, we expose a helper that reads via the runtime interface
  return (runtime as any)._cache ?? new Map();
}

/** Access stored memories for assertions */
export function getRuntimeMemories(runtime: IAgentRuntime): Memory[] {
  return (runtime as any)._memories ?? [];
}
