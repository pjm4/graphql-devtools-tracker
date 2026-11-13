export type OperationType = 'query' | 'mutation' | 'subscription' | 'persisted';

export interface GraphQLRequestItem {
  id: string;
  timestamp: string;
  url: string;
  method: string;
  status: number;
  durationMs: number;
  operationType: OperationType;
  operationName: string;
  query: string;
  variables?: Record<string, unknown> | null;
  extensions?: Record<string, unknown> | null;
  responseBody?: unknown;
  hasGraphQLErrors: boolean;
  batchIndex?: number;
  batchTotal?: number;
}
