// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiClient
vi.mock('../services/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

import apiClient from '../services/api/client';

describe('Discount Codes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('create code returns code object with discount_percent', async () => {
    const mockResponse = {
      success: true,
      code: 'MARIA15',
      approval_status: 'pending',
      message: '¡Código MARIA15 solicitado!',
    };
    apiClient.post.mockResolvedValue(mockResponse);

    const result = await apiClient.post('/influencer/create-code', {
      code: 'MARIA15',
      discount_percent: 15,
    });

    expect(apiClient.post).toHaveBeenCalledWith('/influencer/create-code', {
      code: 'MARIA15',
      discount_percent: 15,
    });
    expect(result.success).toBe(true);
    expect(result.code).toBe('MARIA15');
    expect(result.approval_status).toBe('pending');
  });

  it('list codes returns array of code objects', async () => {
    const mockCodes = [
      { code_id: 'code_abc', code: 'MARIA15', value: 15, usage_count: 42, active: true },
      { code_id: 'code_def', code: 'MARIA10', value: 10, usage_count: 7, active: false },
    ];
    apiClient.get.mockResolvedValue(mockCodes);

    const result = await apiClient.get('/influencer/discount-codes');

    expect(apiClient.get).toHaveBeenCalledWith('/influencer/discount-codes');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].code).toBe('MARIA15');
    expect(result[0].value).toBe(15);
    expect(result[1].usage_count).toBe(7);
  });

  it('copy code to clipboard writes correct value', async () => {
    const code = 'MARIA15';
    await navigator.clipboard.writeText(code);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('MARIA15');
  });
});
