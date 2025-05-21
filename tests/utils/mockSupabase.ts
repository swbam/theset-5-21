import { SupabaseClient } from '@supabase/supabase-js';

export const mockSupabase = () => {
  const mocks = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockReturnThis(),
    error: null,
    data: null,
  };

  return {
    ...mocks,
    mockClear: () => {
      Object.values(mocks).forEach(mock => mock.mockClear());
    },
    mockReset: () => {
      Object.values(mocks).forEach(mock => mock.mockReset());
    },
  } as unknown as SupabaseClient;
}; 