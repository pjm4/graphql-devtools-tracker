import { GraphQLRequestItem, OperationType } from '../types';
import { formatGraphQLQuery } from './formatQuery';

interface RawGraphQLPayload {
  query?: string;
  operationName?: string | null;
  variables?: Record<string, unknown> | string | null;
  extensions?: Record<string, unknown> | null;
}

export function extractOperationDetails(
  queryStr: string | undefined,
  explicitName?: string | null,
  extensions?: Record<string, unknown> | null
): { operationType: OperationType; operationName: string } {
  if (!queryStr || !queryStr.trim()) {
    if (extensions && 'persistedQuery' in extensions) {
      return {
        operationType: 'persisted',
        operationName: explicitName || 'PersistedQuery',
      };
    }
    return {
      operationType: 'query',
      operationName: explicitName || 'Anonymous',
    };
  }

  // Strip single-line comments
  const cleaned = queryStr.replace(/#[^\n\r]*/g, '').trim();
  const match = cleaned.match(/^(query|mutation|subscription)\s+([_A-Za-z][_0-9A-Za-z]*)?/i);

  if (match) {
    const opType = match[1].toLowerCase() as OperationType;
    let opName = explicitName || match[2];
    if (!opName) {
      // Look inside the query selection for the first root field name: query { Media(...) { id } }
      const innerFieldMatch = cleaned.match(/^(?:query|mutation|subscription)[^{]*\{\s*([_A-Za-z][_0-9A-Za-z]*)/i);
      opName = innerFieldMatch ? innerFieldMatch[1] : `Anonymous_${opType}`;
    }
    return { operationType: opType, operationName: opName };
  }

  // Shorthand query syntax: { user { id } }
  const firstFieldMatch = cleaned.match(/^\{\s*([_A-Za-z][_0-9A-Za-z]*)/);
  return {
    operationType: 'query',
    operationName: explicitName || (firstFieldMatch ? firstFieldMatch[1] : 'Anonymous_query'),
  };
}

function safeJsonParse(raw: string | undefined | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseHarEntryToGraphQLItems(
  harEntry: chrome.devtools.network.Request,
  responseContent: string | undefined
): GraphQLRequestItem[] {
  const { request, response, time, startedDateTime } = harEntry;
  const method = request.method.toUpperCase();
  const url = request.url;

  let payloads: RawGraphQLPayload[] = [];

  if (method === 'POST' && request.postData?.text) {
    const parsed = safeJsonParse(request.postData.text);
    if (Array.isArray(parsed)) {
      payloads = parsed.filter(
        (item): item is RawGraphQLPayload =>
          Boolean(item && typeof item === 'object' && ('query' in item || 'extensions' in item))
      );
    } else if (
      parsed &&
      typeof parsed === 'object' &&
      ('query' in parsed || 'extensions' in parsed)
    ) {
      payloads = [parsed as RawGraphQLPayload];
    }
  } else if (method === 'GET') {
    try {
      const parsedUrl = new URL(url);
      const queryParam = parsedUrl.searchParams.get('query');
      const extensionsParam = parsedUrl.searchParams.get('extensions');
      if (queryParam || extensionsParam) {
        payloads = [
          {
            query: queryParam ?? undefined,
            operationName: parsedUrl.searchParams.get('operationName'),
            variables: safeJsonParse(parsedUrl.searchParams.get('variables')) as Record<
              string,
              unknown
            > | null,
            extensions: safeJsonParse(extensionsParam) as Record<string, unknown> | null,
          },
        ];
      }
    } catch {
      // Ignore malformed URLs
    }
  }

  if (payloads.length === 0) {
    return [];
  }

  const parsedResponse = safeJsonParse(responseContent);
  const responseList = Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse];
  const timestamp = new Date(startedDateTime || Date.now()).toLocaleTimeString();

  return payloads.map((payload, idx) => {
    const { operationType, operationName } = extractOperationDetails(
      payload.query,
      payload.operationName,
      payload.extensions
    );

    const parsedVars =
      typeof payload.variables === 'string'
        ? (safeJsonParse(payload.variables) as Record<string, unknown> | null)
        : (payload.variables ?? null);

    const itemResponse = responseList[idx] ?? parsedResponse ?? responseContent ?? null;
    const hasGraphQLErrors = Boolean(
      itemResponse &&
        typeof itemResponse === 'object' &&
        'errors' in itemResponse &&
        Array.isArray((itemResponse as { errors?: unknown[] }).errors) &&
        (itemResponse as { errors: unknown[] }).errors.length > 0
    );

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${idx}`,
      timestamp,
      url,
      method,
      status: response.status,
      durationMs: Math.round(time || 0),
      operationType,
      operationName,
      query: payload.query
        ? formatGraphQLQuery(payload.query)
        : '# Persisted Query (no raw query string sent)',
      variables: parsedVars,
      extensions: payload.extensions ?? null,
      responseBody: itemResponse,
      hasGraphQLErrors,
      batchIndex: payloads.length > 1 ? idx + 1 : undefined,
      batchTotal: payloads.length > 1 ? payloads.length : undefined,
    };
  });
}
