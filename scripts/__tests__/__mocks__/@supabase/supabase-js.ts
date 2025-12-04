import { vi } from 'vitest';

export const mockInsert = vi.fn().mockResolvedValue({ data: [{ id: '123' }], error: null });
export const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

export const createClient = vi.fn().mockReturnValue({
  from: mockFrom,
});
