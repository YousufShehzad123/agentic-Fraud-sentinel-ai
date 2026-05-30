import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";

const BASE = "";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Query keys ──────────────────────────────────────────────────────────────

export const getGetDashboardSummaryQueryKey = () => ["/api/dashboard/summary"] as const;
export const getGetFraudTrendsQueryKey = (params?: { days?: number }) =>
  ["/api/analytics/fraud-trends", params] as const;
export const getListTransactionsQueryKey = (params?: object) =>
  ["/api/transactions", params] as const;
export const getGetTransactionQueryKey = (id: number) =>
  ["/api/transactions", id] as const;
export const getListAlertsQueryKey = (params?: object) =>
  ["/api/alerts", params] as const;
export const getListCasesQueryKey = (params?: object) =>
  ["/api/cases", params] as const;
export const getGetCaseQueryKey = (id: number) =>
  ["/api/cases", id] as const;
export const getGetAgentStatusQueryKey = () => ["/api/agent/status"] as const;
export const getGetRiskDistributionQueryKey = () =>
  ["/api/analytics/risk-distribution"] as const;
export const getGetModelPerformanceQueryKey = () =>
  ["/api/analytics/model-performance"] as const;

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useGetDashboardSummary(options?: UseQueryOptions<any>) {
  return useQuery<any>({
    queryKey: getGetDashboardSummaryQueryKey(),
    queryFn: () => apiFetch("/api/dashboard/summary"),
    ...options,
  });
}

export function useSimulateTransactions() {
  return useMutation<any[], Error, { data: { count: number; fraudRatio: number } }>({
    mutationFn: ({ data }) =>
      apiFetch("/api/simulate", {
        method: "POST",
        body: JSON.stringify({ count: data.count, fraudRatio: data.fraudRatio }),
      }),
  });
}

export function useGetFraudTrends(
  params: { days?: number } = {},
  options?: { query?: UseQueryOptions<any> }
) {
  const qs = params.days ? `?days=${params.days}` : "";
  return useQuery<any[]>({
    queryKey: getGetFraudTrendsQueryKey(params),
    queryFn: () => apiFetch(`/api/analytics/fraud-trends${qs}`),
    ...options?.query,
  });
}

export function useGetRiskDistribution(options?: { query?: UseQueryOptions<any> }) {
  return useQuery<any[]>({
    queryKey: getGetRiskDistributionQueryKey(),
    queryFn: () => apiFetch("/api/analytics/risk-distribution"),
    ...options?.query,
  });
}

export function useGetModelPerformance(options?: { query?: UseQueryOptions<any> }) {
  return useQuery<any>({
    queryKey: getGetModelPerformanceQueryKey(),
    queryFn: () => apiFetch("/api/analytics/model-performance"),
    ...options?.query,
  });
}

export function useListTransactions(
  params: { status?: string; limit?: number } = {},
  options?: { query?: UseQueryOptions<any> }
) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return useQuery<any[]>({
    queryKey: getListTransactionsQueryKey(params),
    queryFn: () => apiFetch(`/api/transactions${q ? "?" + q : ""}`),
    ...options?.query,
  });
}

export function useGetTransaction(id: number, options?: { query?: UseQueryOptions<any> }) {
  return useQuery<any>({
    queryKey: getGetTransactionQueryKey(id),
    queryFn: () => apiFetch(`/api/transactions/${id}`),
    enabled: !!id,
    ...options?.query,
  });
}

export function useUpdateTransaction() {
  return useMutation<any, Error, { id: number; data: { status: string; reviewNote?: string } }>({
    mutationFn: ({ id, data }) =>
      apiFetch(`/api/transactions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  });
}

export function useListAlerts(
  params: { resolved?: boolean } = {},
  options?: { query?: UseQueryOptions<any> }
) {
  const qs = params.resolved !== undefined ? `?resolved=${params.resolved}` : "";
  return useQuery<any[]>({
    queryKey: getListAlertsQueryKey(params),
    queryFn: () => apiFetch(`/api/alerts${qs}`),
    ...options?.query,
  });
}

export function useResolveAlert() {
  return useMutation<any, Error, { id: number; data: { resolvedNote: string } }>({
    mutationFn: ({ id, data }) =>
      apiFetch(`/api/alerts/${id}/resolve`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  });
}

export function useListCases(
  params: { status?: string } = {},
  options?: { query?: UseQueryOptions<any> }
) {
  const qs = params.status ? `?status=${params.status}` : "";
  return useQuery<any[]>({
    queryKey: getListCasesQueryKey(params),
    queryFn: () => apiFetch(`/api/cases${qs}`),
    ...options?.query,
  });
}

export function useGetCase(id: number, options?: { query?: UseQueryOptions<any> }) {
  return useQuery<any>({
    queryKey: getGetCaseQueryKey(id),
    queryFn: () => apiFetch(`/api/cases/${id}`),
    enabled: !!id,
    ...options?.query,
  });
}

export function useUpdateCase() {
  return useMutation<any, Error, { id: number; data: { status?: string; analystNotes?: string } }>({
    mutationFn: ({ id, data }) =>
      apiFetch(`/api/cases/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  });
}

export function useGetAgentStatus(options?: { query?: UseQueryOptions<any> }) {
  return useQuery<any>({
    queryKey: getGetAgentStatusQueryKey(),
    queryFn: () => apiFetch("/api/agent/status"),
    ...options?.query,
  });
}

export function useRetrainModels() {
  return useMutation<any, Error, object>({
    mutationFn: () =>
      apiFetch("/api/agent/retrain", { method: "POST", body: JSON.stringify({}) }),
  });
}
