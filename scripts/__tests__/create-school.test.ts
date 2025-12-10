import { vi, test, expect } from 'vitest';

const mockInsert = vi.fn().mockResolvedValue({ data: [{ id: '123' }], error: null });
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

vi.doMock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    from: mockFrom,
  }),
}));

test('should create a school', async () => {
  const { createSchool } = await import('../create-school');

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-url.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  await createSchool({
    name: 'Test School',
    subdomain: 'test-school',
    code: 'TEST',
  });

  expect(mockFrom).toHaveBeenCalledWith('schools');
  expect(mockInsert).toHaveBeenCalledWith([
    {
      name: 'Test School',
      subdomain: 'test-school',
      code: 'TEST',
    },
  ]);
});
