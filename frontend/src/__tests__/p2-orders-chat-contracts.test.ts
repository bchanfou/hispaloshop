// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { getOrderChatAvailability, getOrderProducerContacts } from '../pages/OrdersPage';

describe('P2 Orders Chat Contracts', () => {
  it('returns single producer contact when order has one producer', () => {
    const items = [
      {
        producer_id: 'prod_1',
        producer_name: 'Aceites del Sur',
      },
      {
        producer_id: 'prod_1',
        producer_name: 'Aceites del Sur',
      },
    ];

    const contacts = getOrderProducerContacts(items);
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toEqual({ id: 'prod_1', name: 'Aceites del Sur' });

    const availability = getOrderChatAvailability(items);
    expect(availability.singleProducer).toEqual({ id: 'prod_1', name: 'Aceites del Sur' });
    expect(availability.hasUnavailableChat).toBe(false);
  });

  it('returns multiple producer contacts when order mixes sellers', () => {
    const items = [
      { producer_id: 'prod_1', producer_name: 'Quesos Norte' },
      { seller_id: 'seller_2', seller_name: 'Miel Artesana' },
    ];

    const availability = getOrderChatAvailability(items);
    expect(availability.producerContacts).toHaveLength(2);
    expect(availability.singleProducer).toBeNull();
    expect(availability.hasUnavailableChat).toBe(false);
  });

  it('marks chat unavailable when order has items but no producer ids', () => {
    const items = [
      { name: 'Producto sin productor' },
      { name: 'Otro item legacy' },
    ];

    const availability = getOrderChatAvailability(items);
    expect(availability.producerContacts).toHaveLength(0);
    expect(availability.singleProducer).toBeNull();
    expect(availability.hasUnavailableChat).toBe(true);
  });
});
