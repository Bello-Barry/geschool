
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

describe('POST /api/auth/register', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    auth: {
      signUp: vi.fn(),
      admin: {
        deleteUser: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createAdminClient as any).mockReturnValue(mockSupabase);
  });

  it('should return 400 if validation fails', async () => {
    const request = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should return 409 if subdomain exists', async () => {
    mockSupabase.maybeSingle.mockResolvedValue({ data: { id: '1' }, error: null });

    const request = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        schoolName: 'Test School',
        subdomain: 'test-school',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
  });

  it('should successfully register a school and user', async () => {
    // 1. Check subdomain exists -> null
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    // 2. Insert school -> success (returns chainable)
    mockSupabase.single.mockResolvedValue({ data: { id: 'school-id' }, error: null });
    // 3. Sign up user -> success
    mockSupabase.auth.signUp.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null });
    // 4. Insert profile -> success
    // We don't overwrite insert mock here because it needs to stay chainable for the first call
    // and the second call just needs the resolved value which we can handle by letting single/maybeSingle not be called
    // Wait, the second insert is NOT chained with select().single().
    // So it will return mockSupabase, which is then awaited.
    // If we want it to return { error: null }, we can use mockImplementationOnce
    mockSupabase.insert
      .mockReturnValueOnce(mockSupabase) // for school
      .mockResolvedValueOnce({ error: null }); // for profile

    const request = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        schoolName: 'Test School',
        subdomain: 'test-school',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.message).toBe('Compte créé avec succès');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test School',
        subdomain: 'test-school',
        code: expect.stringContaining('TESTSCHOOL-')
    }));
  });
});
