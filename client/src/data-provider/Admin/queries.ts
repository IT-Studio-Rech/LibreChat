import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type {
  BonusCodeWithUser,
  ChargeAggregate,
  GenerateBonusCodesParams,
  GenerateBonusCodesResponse,
  VaultUploadResponse,
} from 'librechat-data-provider';

export const useGenerateBonusCodes = (options?: {
  onSuccess?: (data: GenerateBonusCodesResponse, variables: GenerateBonusCodesParams) => void;
  onError?: (error: Error) => void;
}): UseMutationResult<GenerateBonusCodesResponse, Error, GenerateBonusCodesParams> => {
  const queryClient = useQueryClient();

  return useMutation([MutationKeys.generateBonusCodes], {
    mutationFn: (payload: GenerateBonusCodesParams) => dataService.generateBonusCodes(payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries([QueryKeys.bonusCharges]);
      options?.onSuccess?.(data, variables);
    },
    onError: (error: Error) => options?.onError?.(error),
  });
};

export const useChargesList = (): UseQueryResult<ChargeAggregate[]> => {
  return useQuery<ChargeAggregate[]>(
    [QueryKeys.bonusCharges],
    () => dataService.getBonusCharges(),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
};

export const useVaultUpload = (options?: {
  onSuccess?: (data: VaultUploadResponse) => void;
  onError?: (error: Error) => void;
}): UseMutationResult<VaultUploadResponse, Error, { file: File; category: string }> => {
  return useMutation([MutationKeys.vaultUpload], {
    mutationFn: ({ file, category }) => dataService.uploadVaultFile(file, category),
    onSuccess: (data) => options?.onSuccess?.(data),
    onError: (error: Error) => options?.onError?.(error),
  });
};

export const useChargeDetails = (
  description: string,
  enabled = true,
): UseQueryResult<BonusCodeWithUser[]> => {
  return useQuery<BonusCodeWithUser[]>(
    [QueryKeys.bonusChargeDetails, description],
    () => dataService.getBonusChargeDetails(description),
    {
      enabled: enabled && description.length > 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
};
