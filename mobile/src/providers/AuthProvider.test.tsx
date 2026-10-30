import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { NetworkError, request, setUnauthorizedHandler } from '@/lib/api-client';
import * as tokenStorage from '@/lib/token-storage';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';

jest.mock('@/lib/token-storage', () => ({ getToken: jest.fn(), saveToken: jest.fn(), clearToken: jest.fn() }));
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  request: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));

const getToken = tokenStorage.getToken as jest.Mock;
const requestMock = request as jest.Mock;

// Holds the latest context value for the tests to call into.
const captured: { current: ReturnType<typeof useAuth> | null } = { current: null };
const auth = {
  signIn: (email: string, password: string) => captured.current!.signIn(email, password),
  signOut: () => captured.current!.signOut(),
};

function Probe() {
  const value = useAuth();

  useEffect(() => {
    captured.current = value;
  });

  return <Text>{value.status}</Text>;
}

async function renderProvider() {
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.resetAllMocks();
});

it('starts signed out without a stored token and signed in with one', async () => {
  getToken.mockResolvedValue(null);
  await renderProvider();
  expect(await screen.findByText('signedOut')).toBeTruthy();
});

it('starts signed in with a stored token', async () => {
  getToken.mockResolvedValue('token');
  await renderProvider();
  expect(await screen.findByText('signedIn')).toBeTruthy();
});

it('stores the token from a successful login', async () => {
  getToken.mockResolvedValue(null);
  requestMock.mockResolvedValue({ data: { token: 'new-token' } });
  await renderProvider();
  await screen.findByText('signedOut');

  await act(() => auth.signIn('owner@example.com', 'password'));

  expect(requestMock).toHaveBeenCalledWith(
    '/auth/login',
    expect.objectContaining({ method: 'POST', auth: false, body: expect.objectContaining({ email: 'owner@example.com' }) }),
  );
  expect(tokenStorage.saveToken).toHaveBeenCalledWith('new-token');
  expect(await screen.findByText('signedIn')).toBeTruthy();
});

it('revokes the server token on logout and clears local access', async () => {
  getToken.mockResolvedValue('token');
  requestMock.mockResolvedValue(undefined);
  await renderProvider();
  await screen.findByText('signedIn');

  let result: { revoked: boolean } | undefined;
  await act(async () => {
    result = await auth.signOut();
  });

  expect(result).toEqual({ revoked: true });
  expect(tokenStorage.clearToken).toHaveBeenCalled();
  expect(await screen.findByText('signedOut')).toBeTruthy();
});

it('offline logout clears local access but does not claim the server token was revoked', async () => {
  getToken.mockResolvedValue('token');
  requestMock.mockRejectedValue(new NetworkError());
  await renderProvider();
  await screen.findByText('signedIn');

  let result: { revoked: boolean } | undefined;
  await act(async () => {
    result = await auth.signOut();
  });

  expect(result).toEqual({ revoked: false });
  expect(tokenStorage.clearToken).toHaveBeenCalled();
  expect(await screen.findByText('signedOut')).toBeTruthy();
});

it('ends the session when the API answers 401', async () => {
  getToken.mockResolvedValue('token');
  await renderProvider();
  await screen.findByText('signedIn');

  const handler = (setUnauthorizedHandler as jest.Mock).mock.calls.map((call) => call[0]).filter(Boolean).at(-1);
  await act(async () => handler());

  await waitFor(() => expect(screen.getByText('signedOut')).toBeTruthy());
  expect(tokenStorage.clearToken).toHaveBeenCalled();
});
