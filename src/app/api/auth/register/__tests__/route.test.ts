
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
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    auth: {
      admin: {
        createUser: vi.fn(),
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
    // 1. email check -> null
    // 2. subdomain check -> exists
    mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null }) // email
        .mockResolvedValueOnce({ data: { id: '1' }, error: null }); // subdomain

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
    // 1. Check email exists -> null
    // 2. Check subdomain exists -> null
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    // 3. Insert school -> success (returns chainable)
    mockSupabase.single.mockResolvedValue({ data: { id: 'school-id' }, error: null });
    // 4. Create user -> success
    mockSupabase.auth.admin.createUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null });
    // 5. Insert profile -> success (now using upsert)
    mockSupabase.insert.mockReturnValueOnce(mockSupabase); // for school
    mockSupabase.upsert.mockResolvedValueOnce({ error: null }); // for profile

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

    expect(mockSupabase.upsert).toHaveBeenCalledWith(expect.objectContaining({
        email: 'john@example.com',
        role: 'super_admin'
    }), expect.any(Object));
  });
});
