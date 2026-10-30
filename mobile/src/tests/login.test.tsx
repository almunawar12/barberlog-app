import { fireEvent, render, screen } from '@testing-library/react-native';

import Login from '@/app/(auth)/login';
import { ApiError, NetworkError } from '@/lib/api-client';
import { id } from '@/locales/id';

const mockSignIn = jest.fn();

jest.mock('expo-router', () => ({ Link: jest.requireActual('react-native').Text }));
jest.mock('@/providers/AuthProvider', () => ({ useAuth: () => ({ signIn: mockSignIn }) }));

beforeEach(() => {
  mockSignIn.mockReset();
});

async function fillAndSubmit(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText(id.auth.email), email);
  await fireEvent.changeText(screen.getByLabelText(id.auth.password), password);
  await fireEvent.press(screen.getByRole('button', { name: id.auth.login }));
}

it('cannot submit until both fields are filled', async () => {
  await render(<Login />);

  expect(screen.getByRole('button', { name: id.auth.login }).props.accessibilityState.disabled).toBe(true);
});

it('signs in with the trimmed email', async () => {
  mockSignIn.mockResolvedValue(undefined);
  await render(<Login />);

  await fillAndSubmit('  owner@example.com ', 'rahasia');

  expect(mockSignIn).toHaveBeenCalledWith('owner@example.com', 'rahasia');
});

it('shows the Indonesian credential error, keeps the email and clears the password', async () => {
  mockSignIn.mockRejectedValue(new ApiError(422, 'Email atau kata sandi salah.', undefined, { email: ['Email atau kata sandi salah.'] }));
  await render(<Login />);

  await fillAndSubmit('owner@example.com', 'salah');

  expect(await screen.findByText('Email atau kata sandi salah.')).toBeTruthy();
  expect(screen.getByLabelText(id.auth.email).props.value).toBe('owner@example.com');
  expect(screen.getByLabelText(id.auth.password).props.value).toBe('');
});

it('does not blame the credentials when the server cannot be reached', async () => {
  mockSignIn.mockRejectedValue(new NetworkError());
  await render(<Login />);

  await fillAndSubmit('owner@example.com', 'rahasia');

  expect(await screen.findByText(id.errors.uncertain)).toBeTruthy();
});
