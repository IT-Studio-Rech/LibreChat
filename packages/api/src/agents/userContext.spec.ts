import { fetchUserICP, invalidateUserICP } from './userContext';

jest.mock('@librechat/data-schemas', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

beforeAll(() => {
  global.fetch = mockFetch;
});

afterEach(() => {
  jest.clearAllMocks();
  // Invalidate cache between tests so each test starts fresh
  invalidateUserICP('user-123');
  invalidateUserICP('user-404');
  invalidateUserICP('user-network-error');
  invalidateUserICP('user-timeout');
  invalidateUserICP('user-cache');
  invalidateUserICP('user-string-icp');
});

describe('fetchUserICP', () => {
  it('returns formatted markdown string on 200 with object icp_json', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user_id: 'user-123',
        icp_json: {
          Zielgruppe: 'Frauen 30-45',
          Hauptproblem: 'Zeitmanagement',
        },
      }),
    } as Response);

    const result = await fetchUserICP('user-123');

    expect(result).toBe('## Zielgruppe\nFrauen 30-45\n\n## Hauptproblem\nZeitmanagement');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns string as-is when icp_json is already a string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user_id: 'user-string-icp',
        icp_json: '## Zielgruppe\nFrauen 30-45',
      }),
    } as Response);

    const result = await fetchUserICP('user-string-icp');

    expect(result).toBe('## Zielgruppe\nFrauen 30-45');
  });

  it('returns null on 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    const result = await fetchUserICP('user-404');

    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns null on 500', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    const result = await fetchUserICP('user-123');

    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const result = await fetchUserICP('user-network-error');

    expect(result).toBeNull();
  });

  it('returns null on timeout (AbortError)', async () => {
    const abortErr = new DOMException('The operation was aborted.', 'AbortError');
    mockFetch.mockRejectedValueOnce(abortErr);

    const result = await fetchUserICP('user-timeout');

    expect(result).toBeNull();
  });

  it('returns cached result without a second HTTP call', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user_id: 'user-cache',
        icp_json: { Segment: 'Early Adopter' },
      }),
    } as Response);

    const first = await fetchUserICP('user-cache');
    const second = await fetchUserICP('user-cache');

    expect(first).toBe(second);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('makes a new HTTP call after cache invalidation', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user_id: 'user-123', icp_json: { A: 'first' } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user_id: 'user-123', icp_json: { A: 'second' } }),
      } as Response);

    await fetchUserICP('user-123');
    invalidateUserICP('user-123');
    const result = await fetchUserICP('user-123');

    expect(result).toBe('## A\nsecond');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
