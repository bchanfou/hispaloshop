import { useMemo } from 'react';
import { useCreateAddress, useSavedAddresses } from '../queries';
import { useAuth } from '../../../context/AuthContext';

export function useCartAddresses() {
  const { user } = useAuth();
  const addressesQuery = useSavedAddresses({ enabled: Boolean(user) });
  const createAddressMutation = useCreateAddress();
  const savedAddresses = addressesQuery.data || [];

  const defaultAddressId = useMemo(() => {
    const defaultAddress = savedAddresses.find((address) => address.is_default);
    return defaultAddress?.address_id || savedAddresses[0]?.address_id || null;
  }, [savedAddresses]);

  return {
    savedAddresses,
    defaultAddressId,
    isLoading: addressesQuery.isLoading,
    createAddress: (payload) => createAddressMutation.mutateAsync(payload),
    savingAddress: createAddressMutation.isPending,
    refetch: addressesQuery.refetch,
  };
}

export default useCartAddresses;
