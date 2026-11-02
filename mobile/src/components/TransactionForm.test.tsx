import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TransactionForm } from '@/components/TransactionForm';
import { ApiError, NetworkError, request } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { id } from '@/locales/id';
import type { Service, Transaction } from '@/types';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn() },
  usePreventRemove: jest.fn(() => jest.fn()),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => '11111111-1111-4111-8111-111111111111' }));
jest.mock('@react-native-community/datetimepicker', () => ({ DateTimePickerAndroid: { open: jest.fn() } }));
jest.mock('@/lib/notify', () => ({ notify: jest.fn() }));
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  request: jest.fn(),
}));

const requestMock = request as jest.Mock;
const services: Service[] = [{ id: 1, name: 'Potong Rambut', price: 25000, is_active: true }];

async function renderForm(props: Partial<React.ComponentProps<typeof TransactionForm>> = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

  await render(
    <QueryClientProvider client={client}>
      <TransactionForm services={services} defaultServiceId={1} {...props} />
    </QueryClientProvider>,
  );
}

const pressSave = () => fireEvent.press(screen.getByRole('button', { name: id.common.save }));

beforeEach(() => {
  jest.clearAllMocks();
});

it('preselects the default service with its master price and shows a client-side total preview', async () => {
  await renderForm();

  expect(screen.getByLabelText(id.transaction.price).props.value).toBe('25000');
  expect(screen.getByLabelText(`${id.transaction.totalPreview}: Rp25.000`)).toBeTruthy();
});

it('sends one transaction with the Idempotency-Key, and confirms only after the server answered', async () => {
  requestMock.mockResolvedValue({ data: { id: 7 } });
  await renderForm();

  await pressSave();

  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  expect(requestMock).toHaveBeenCalledTimes(1);
  const [path, options] = requestMock.mock.calls[0];
  expect(path).toBe('/transactions');
  expect(options.method).toBe('POST');
  expect(options.idempotencyKey).toBe('11111111-1111-4111-8111-111111111111');
  expect(options.body).toMatchObject({
    payment_method: 'cash',
    items: [{ service_id: 1, quantity: 1, unit_price: 25000 }],
    note: null,
  });
  expect(options.body.occurred_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+07:00$/);
  expect(notify).toHaveBeenCalledWith(id.toast.transactionSaved);
});

it('after a timeout shows an uncertain message, never a success, and retries with the same key and payload', async () => {
  requestMock.mockRejectedValueOnce(new NetworkError()).mockResolvedValueOnce({ data: { id: 7 } });
  await renderForm();

  await pressSave();

  expect(await screen.findByText(id.errors.uncertain)).toBeTruthy();
  expect(notify).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();

  await pressSave();

  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  expect(requestMock).toHaveBeenCalledTimes(2);
  expect(requestMock.mock.calls[1][1].idempotencyKey).toBe(requestMock.mock.calls[0][1].idempotencyKey);
  expect(requestMock.mock.calls[1][1].body).toEqual(requestMock.mock.calls[0][1].body);
});

it('treats a 500 like a timeout: the write may have been committed', async () => {
  requestMock.mockRejectedValue(new ApiError(500, 'Server Error'));
  await renderForm();

  await pressSave();

  expect(await screen.findByText(id.errors.uncertain)).toBeTruthy();
  expect(notify).not.toHaveBeenCalled();
});

it('keeps what the owner typed and shows the field message on a validation error', async () => {
  requestMock.mockRejectedValue(
    new ApiError(422, 'Total transaksi harus lebih dari Rp0.', undefined, { 'items.0.unit_price': ['Harga wajib diisi.'] }),
  );
  await renderForm();
  await fireEvent.changeText(screen.getByLabelText(id.transaction.quantity), '3');

  await pressSave();

  expect(await screen.findByText('Harga wajib diisi.')).toBeTruthy();
  expect(screen.getByLabelText(id.transaction.quantity).props.value).toBe('3');
  expect(router.replace).not.toHaveBeenCalled();
});

it('shows the server conflict message with a reload action on 409', async () => {
  requestMock.mockRejectedValue(new ApiError(409, 'Data ini sudah diubah dari perangkat lain.', 'idempotency_key_conflict'));
  await renderForm();

  await pressSave();

  expect(await screen.findByText('Data ini sudah diubah dari perangkat lain.')).toBeTruthy();
  expect(screen.getByRole('button', { name: id.common.reload })).toBeTruthy();
});

it('edits with the expected version instead of an idempotency key', async () => {
  requestMock.mockResolvedValue({ data: { id: 5 } });
  const transaction: Transaction = {
    id: 5,
    reference: 'TRX-000005',
    occurred_at: '2026-10-30T02:00:00+00:00',
    payment_method: 'qris',
    total_amount: 50000,
    note: 'Rapi',
    version: 3,
    items: [{ id: 1, service_id: 1, service_name: 'Potong Rambut', unit_price: 25000, quantity: 2, line_total: 50000 }],
  };
  await renderForm({ transaction });

  await pressSave();

  await waitFor(() => expect(router.back).toHaveBeenCalled());
  const [path, options] = requestMock.mock.calls[0];
  expect(path).toBe('/transactions/5');
  expect(options.method).toBe('PUT');
  expect(options.idempotencyKey).toBeUndefined();
  expect(options.body).toMatchObject({
    expected_version: 3,
    payment_method: 'qris',
    occurred_at: '2026-10-30T09:00:00+07:00',
    note: 'Rapi',
  });
});

it('offers a path to Pengaturan when there are no services', async () => {
  await renderForm({ services: [], defaultServiceId: null });

  await fireEvent.press(screen.getByRole('button', { name: id.transaction.goToSettings }));

  expect(router.push).toHaveBeenCalledWith('/settings');
});
