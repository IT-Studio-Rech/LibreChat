import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type {
  ICPRecord,
  ICPUpdatePayload,
  Lead,
  LeadCreatePayload,
  LeadListOptions,
  LeadListResponse,
  LeadUpdatePayload,
} from 'librechat-data-provider';

export const useProfileICP = (): UseQueryResult<ICPRecord> => {
  return useQuery<ICPRecord>(
    [QueryKeys.profileICP],
    () => dataService.getProfileICP(),
    {
      refetchOnWindowFocus: false,
      retry: false,
    },
  );
};

export const useUpdateProfileICP = (options?: {
  onSuccess?: (data: ICPRecord) => void;
  onError?: (error: Error) => void;
}): UseMutationResult<ICPRecord, Error, ICPUpdatePayload> => {
  const queryClient = useQueryClient();

  return useMutation([MutationKeys.updateProfileICP], {
    mutationFn: (payload: ICPUpdatePayload) => dataService.updateProfileICP(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKeys.profileICP]);
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => options?.onError?.(error),
  });
};

export const useProfileLeads = (
  opts?: LeadListOptions,
  enabled = true,
): UseQueryResult<LeadListResponse> => {
  return useQuery<LeadListResponse>(
    [QueryKeys.profileLeads, opts],
    () => dataService.listProfileLeads(opts),
    {
      enabled,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );
};

export const useCreateProfileLead = (options?: {
  onSuccess?: (data: Lead) => void;
  onError?: (error: Error) => void;
}): UseMutationResult<Lead, Error, LeadCreatePayload> => {
  const queryClient = useQueryClient();

  return useMutation([MutationKeys.createProfileLead], {
    mutationFn: (payload: LeadCreatePayload) => dataService.createProfileLead(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKeys.profileLeads]);
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => options?.onError?.(error),
  });
};

export const useUpdateProfileLead = (options?: {
  onSuccess?: (data: Lead) => void;
  onError?: (error: Error) => void;
}): UseMutationResult<Lead, Error, { leadId: string; partial: LeadUpdatePayload }> => {
  const queryClient = useQueryClient();

  return useMutation([MutationKeys.updateProfileLead], {
    mutationFn: ({ leadId, partial }: { leadId: string; partial: LeadUpdatePayload }) =>
      dataService.updateProfileLead(leadId, partial),
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKeys.profileLeads]);
      queryClient.invalidateQueries([QueryKeys.profileLead, data.id]);
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => options?.onError?.(error),
  });
};

export const useDeleteProfileLead = (options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation([MutationKeys.deleteProfileLead], {
    mutationFn: (leadId: string) => dataService.deleteProfileLead(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.profileLeads]);
      options?.onSuccess?.();
    },
    onError: (error: Error) => options?.onError?.(error),
  });
};
