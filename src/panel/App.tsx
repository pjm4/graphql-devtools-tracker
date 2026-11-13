import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GraphQLRequestItem, OperationType } from './types';
import { parseHarEntryToGraphQLItems } from './utils/parseGraphQL';
import { formatGraphQLQuery } from './utils/formatQuery';

type InspectorTab = 'query' | 'variables' | 'response';

const DEMO_REQUESTS: GraphQLRequestItem[] = [
  {
    id: 'demo-1',
    timestamp: new Date().toLocaleTimeString(),
    url: 'https://api.example.com/graphql',
    method: 'POST',
    status: 200,
    durationMs: 84,
    operationType: 'query',
    operationName: 'GetUserProfile',
    query: `query GetUserProfile($userId: ID!) {\n  user(id: $userId) {\n    id\n    name\n    email\n    roles\n  }\n}`,
    variables: { userId: 'usr_94810' },
    responseBody: {
      data: {
        user: {
          id: 'usr_94810',
          name: 'Ada Lovelace',
          email: 'ada@analytical.engine',
          roles: ['admin', 'developer'],
        },
      },
    },
    hasGraphQLErrors: false,
  },
  {
    id: 'demo-2',
    timestamp: new Date().toLocaleTimeString(),
    url: 'https://api.example.com/graphql',
    method: 'POST',
    status: 200,
    durationMs: 142,
    operationType: 'mutation',
    operationName: 'UpdateProjectSettings',
    query: `mutation UpdateProjectSettings($input: ProjectSettingsInput!) {\n  updateProjectSettings(input: $input) {\n    id\n    updatedAt\n  }\n}`,
    variables: {
      input: {
        projectId: 'prj_301',
        enableNotifications: true,
      },
    },
    responseBody: {
      data: null,
      errors: [
        {
          message: 'Permission denied: insufficient scope for project prj_301',
          path: ['updateProjectSettings'],
          extensions: { code: 'FORBIDDEN' },
        },
      ],
    },
    hasGraphQLErrors: true,
  },
  {
    id: 'demo-3',
    timestamp: new Date().toLocaleTimeString(),
    url: 'https://api.example.com/graphql',
    method: 'POST',
    status: 200,
    durationMs: 215,
    operationType: 'query',
    operationName: 'ListProducts',
    query: `query ListProducts($filter: ProductFilterInput, $limit: Int = 10) {\n  products(filter: $filter, limit: $limit) {\n    items {\n      id\n      title\n      sku\n      price {\n        amount\n        currency\n      }\n      inStock\n    }\n    totalCount\n  }\n}`,
    variables: {
      filter: { category: 'electronics', minRating: 4 },
      limit: 5,
    },
    responseBody: {
      data: {
        products: {
          items: [
            { id: 'prod_001', title: 'Mechanical Keyboard TKL', sku: 'KB-MEC-87', price: { amount: 129.99, currency: 'USD' }, inStock: true },
            { id: 'prod_002', title: 'Ultra-wide Monitor 34"', sku: 'MON-UW-34', price: { amount: 489.0, currency: 'USD' }, inStock: true },
            { id: 'prod_003', title: 'Wireless Ergonomic Mouse', sku: 'MS-WL-01', price: { amount: 79.5, currency: 'USD' }, inStock: false },
          ],
          totalCount: 3,
        },
      },
    },
    hasGraphQLErrors: false,
  },
  {
    id: 'demo-4',
    timestamp: new Date().toLocaleTimeString(),
    url: 'https://api.example.com/graphql',
    method: 'POST',
    status: 200,
    durationMs: 310,
    operationType: 'subscription',
    operationName: 'OnMessageReceived',
    query: `subscription OnMessageReceived($channelId: ID!) {\n  messageReceived(channelId: $channelId) {\n    id\n    channelId\n    sender {\n      id\n      name\n    }\n    content\n    sentAt\n  }\n}`,
    variables: { channelId: 'chan_general' },
    responseBody: {
      data: {
        messageReceived: {
          id: 'msg_984123',
          channelId: 'chan_general',
          sender: { id: 'usr_94810', name: 'Ada Lovelace' },
          content: 'Deployment pipeline completed successfully.',
          sentAt: '2026-11-13T01:15:00Z',
        },
      },
    },
    hasGraphQLErrors: false,
  },
  {
    id: 'demo-5',
    timestamp: new Date().toLocaleTimeString(),
    url: 'https://api.example.com/graphql',
    method: 'GET',
    status: 200,
    durationMs: 65,
    operationType: 'persisted',
    operationName: 'GetFeatureFlags',
    query: '# Persisted Query (hash: a3f829bc14d9e0340f6d89283fa8b1)',
    variables: { env: 'production', clientId: 'web-client-v2' },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: 'a3f829bc14d9e0340f6d89283fa8b1c4355de90a87f12e8b23c2149b019df1',
      },
    },
    responseBody: {
      data: {
        featureFlags: {
          newDashboard: true,
          betaDarkTheme: true,
          enableLiveStreaming: false,
        },
      },
    },
    hasGraphQLErrors: false,
  },
  {
    id: 'demo-6',
    timestamp: new Date().toLocaleTimeString(),
    url: 'https://api.example.com/graphql',
    method: 'POST',
    status: 200,
    durationMs: 190,
    operationType: 'query',
    operationName: 'BatchQuery_UserSummary',
    query: `query BatchQuery_UserSummary($userId: ID!) {\n  user(id: $userId) {\n    id\n    name\n  }\n}`,
    variables: { userId: 'usr_94810' },
    responseBody: {
      data: {
        user: { id: 'usr_94810', name: 'Ada Lovelace' },
      },
    },
    hasGraphQLErrors: false,
    batchIndex: 1,
    batchTotal: 2,
  },
  {
    id: 'demo-7',
    timestamp: new Date().toLocaleTimeString(),
    url: 'https://api.example.com/graphql',
    method: 'POST',
    status: 200,
    durationMs: 190,
    operationType: 'query',
    operationName: 'BatchQuery_UserNotifications',
    query: `query BatchQuery_UserNotifications($userId: ID!) {\n  notifications(userId: $userId) {\n    unreadCount\n  }\n}`,
    variables: { userId: 'usr_94810' },
    responseBody: {
      data: {
        notifications: { unreadCount: 4 },
      },
    },
    hasGraphQLErrors: false,
    batchIndex: 2,
    batchTotal: 2,
  },
  {
    id: 'demo-8',
    timestamp: new Date().toLocaleTimeString(),
    url: 'https://api.example.com/graphql',
    method: 'POST',
    status: 500,
    durationMs: 420,
    operationType: 'mutation',
    operationName: 'DeleteOrganization',
    query: `mutation DeleteOrganization($orgId: ID!) {\n  deleteOrganization(id: $orgId) {\n    success\n  }\n}`,
    variables: { orgId: 'org_core_99' },
    responseBody: {
      errors: [
        {
          message: 'Internal Server Error: database connection timeout during transaction commit',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        },
      ],
    },
    hasGraphQLErrors: true,
  },
];

const DEFAULT_LIST_WIDTH = 340;
const MIN_LIST_WIDTH = 180;
const MIN_DETAIL_WIDTH = 320;
const DIVIDER_WIDTH = 5;

export const App: React.FC = () => {
  const [requests, setRequests] = useState<GraphQLRequestItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [typeFilter, setTypeFilter] = useState<OperationType | 'all' | 'errors'>('all');
  const [activeTab, setActiveTab] = useState<InspectorTab>('response');
  const [copied, setCopied] = useState(false);
  const [formatQueries, setFormatQueries] = useState(true);
  const [listWidth, setListWidth] = useState<number>(DEFAULT_LIST_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const splitPaneRef = useRef<HTMLDivElement | null>(null);

  const clampListWidth = useCallback((desiredWidth: number) => {
    const container = splitPaneRef.current;
    if (!container) return desiredWidth;
    const maxLeft = Math.max(
      MIN_LIST_WIDTH,
      container.getBoundingClientRect().width - DIVIDER_WIDTH - 8
    );
    return Math.min(maxLeft, Math.max(MIN_LIST_WIDTH, desiredWidth));
  }, []);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const container = splitPaneRef.current;
    if (!container) return;

    const syncWidthToContainer = () => {
      setListWidth((prev) => clampListWidth(prev));
    };

    syncWidthToContainer();
    const observer = new ResizeObserver(syncWidthToContainer);
    observer.observe(container);
    return () => observer.disconnect();
  }, [clampListWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = splitPaneRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setListWidth(clampListWidth(e.clientX - rect.left));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, clampListWidth]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.devtools?.network) {
      return;
    }

    const handleRequestFinished = (harEntry: chrome.devtools.network.Request) => {
      harEntry.getContent((content) => {
        const items = parseHarEntryToGraphQLItems(harEntry, content);
        if (items.length > 0) {
          setRequests((prev) => {
            const next = [...prev, ...items];
            if (prev.length === 0 && items[0]) {
              setSelectedId(items[0].id);
            }
            return next;
          });
        }
      });
    };

    chrome.devtools.network.onRequestFinished.addListener(handleRequestFinished);
    return () => {
      chrome.devtools.network.onRequestFinished.removeListener(handleRequestFinished);
    };
  }, []);

  const { itemMatcher, regexError } = useMemo(() => {
    const raw = search.trim();
    if (!raw) {
      return { itemMatcher: null, regexError: null as string | null };
    }

    // Test whether an item matches a predicate fn.
    // If negate is true (e.g. -media), we only want to exclude operations whose operationName matches
    // (or if explicit regex/query search was targeted). We do NOT want to exclude queries simply because
    // a field inside their query body happens to contain the substring!
    const testItem = (
      item: GraphQLRequestItem,
      fn: (text: string) => boolean,
      negate: boolean
    ): boolean => {
      const opNameMatch = fn(item.operationName);
      if (negate) {
        // Exclude only if operationName matches
        return !opNameMatch;
      }

      // Positive search matches if found in operationName, query, or url
      return opNameMatch || fn(item.query) || fn(item.url);
    };

    // Helper to compile a single token (supports optional leading '-' or '!' for negation)
    const buildTokenMatcher = (
      token: string,
      forceRegex: boolean
    ): ((item: GraphQLRequestItem) => boolean) => {
      let negate = false;
      let expr = token;

      if ((expr.startsWith('-') || expr.startsWith('!')) && expr.length > 1) {
        negate = true;
        expr = expr.slice(1).trim();
      }

      const slashLiteralMatch = expr.match(/^\/(.+)\/([gimsuy]*)$/);
      if (forceRegex || slashLiteralMatch) {
        const pattern = slashLiteralMatch ? slashLiteralMatch[1] : expr;
        const rawFlags = slashLiteralMatch ? slashLiteralMatch[2] : 'i';
        const flags = slashLiteralMatch ? rawFlags || 'i' : 'i';
        const regex = new RegExp(pattern, flags);
        return (item: GraphQLRequestItem) => testItem(item, (text) => regex.test(text), negate);
      }

      const lower = expr.toLowerCase();
      return (item: GraphQLRequestItem) =>
        testItem(item, (text) => text.toLowerCase().includes(lower), negate);
    };

    try {
      // If regex mode is toggled on, or the whole input is a single (optionally negated) /regex/ literal
      if (useRegex || /^[-!]?\/.+\/[gimsuy]*$/.test(raw)) {
        const matcher = buildTokenMatcher(raw, useRegex);
        return { itemMatcher: matcher, regexError: null };
      }

      // Otherwise support space-separated tokens (e.g. "-get", "user -mutation", "-/^get/")
      const tokens = raw.split(/\s+/).filter(Boolean);
      const tokenMatchers = tokens.map((t) => buildTokenMatcher(t, false));
      return {
        itemMatcher: (item: GraphQLRequestItem) => tokenMatchers.every((m) => m(item)),
        regexError: null,
      };
    } catch (err) {
      return {
        itemMatcher: null,
        regexError: err instanceof Error ? err.message : 'Invalid regular expression',
      };
    }
  }, [search, useRegex]);

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      if (typeFilter === 'errors' && !item.hasGraphQLErrors && item.status < 400) {
        return false;
      }
      if (typeFilter !== 'all' && typeFilter !== 'errors' && item.operationType !== typeFilter) {
        return false;
      }
      if (search.trim()) {
        if (regexError || !itemMatcher) {
          return false;
        }
        return itemMatcher(item);
      }
      return true;
    });
  }, [requests, search, typeFilter, itemMatcher, regexError]);

  const selectedItem = useMemo(
    () => filteredRequests.find((r) => r.id === selectedId) ?? filteredRequests[0] ?? null,
    [selectedId, filteredRequests]
  );

  const activeContentString = useMemo(() => {
    if (!selectedItem) return '';
    if (activeTab === 'query') {
      return formatQueries ? formatGraphQLQuery(selectedItem.query) : selectedItem.query;
    }
    if (activeTab === 'variables') {
      return JSON.stringify(selectedItem.variables ?? {}, null, 2);
    }
    return typeof selectedItem.responseBody === 'string'
      ? selectedItem.responseBody
      : JSON.stringify(selectedItem.responseBody ?? {}, null, 2);
  }, [selectedItem, activeTab, formatQueries]);

  const handleCopy = () => {
    if (!activeContentString) return;
    navigator.clipboard.writeText(activeContentString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const loadSampleData = () => {
    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toLocaleTimeString();
    const clonedBatch = DEMO_REQUESTS.map((item, idx) => ({
      ...item,
      id: `${item.id}-${batchId}-${idx}`,
      timestamp: now,
    }));
    setRequests((prev) => [...prev, ...clonedBatch]);
    if (!selectedId && clonedBatch[0]) {
      setSelectedId(clonedBatch[0].id);
    }
  };

  const badgeLabel = (type: OperationType) => {
    switch (type) {
      case 'query':
        return 'Q';
      case 'mutation':
        return 'M';
      case 'subscription':
        return 'S';
      case 'persisted':
        return 'P';
    }
  };

  return (
    <div className="app-shell">
      <header className="toolbar">
        <span className="toolbar-title">◈ GraphQL</span>
        <div className={`search-box ${regexError ? 'search-box-error' : ''}`} title={regexError ?? undefined}>
          <input
            className="search-input"
            type="text"
            placeholder={
              useRegex
                ? 'Regex filter (e.g. ^Get, -^get)...'
                : 'Filter (e.g. user, -get, /^get/)...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className={`regex-toggle-btn ${useRegex ? 'active' : ''}`}
            onClick={() => setUseRegex((prev) => !prev)}
            title="Use Regular Expression (or wrap pattern in /.../)"
            aria-label="Toggle Regular Expression filter"
          >
            .*
          </button>
        </div>
        <div className="filter-pills">
          {(['all', 'query', 'mutation', 'subscription', 'errors'] as const).map((f) => (
            <button
              key={f}
              className={`pill-btn ${typeFilter === f ? 'active' : ''}`}
              onClick={() => setTypeFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="toolbar-spacer" />
        <button className="pill-btn" onClick={loadSampleData} title="Load sample GraphQL operations">
          + Sample Data
        </button>
        <button
          className="pill-btn"
          onClick={() => {
            setRequests([]);
            setSelectedId(null);
          }}
        >
          Clear ({requests.length})
        </button>
      </header>

      <div className="split-pane" ref={splitPaneRef}>
        <aside className="request-list-pane" style={{ width: `${listWidth}px` }}>
          {filteredRequests.length === 0 ? (
            <div className="empty-state">
              {regexError ? (
                <>
                  <p style={{ color: 'var(--status-err)', fontWeight: 600 }}>Invalid Regular Expression</p>
                  <p style={{ marginTop: 6, fontSize: 11 }}>{regexError}</p>
                </>
              ) : requests.length > 0 ? (
                <p>No GraphQL operations match the current filter.</p>
              ) : (
                <>
                  <p>Waiting for GraphQL network requests...</p>
                  <p style={{ marginTop: 8, fontSize: 11 }}>
                    Trigger a GraphQL request on the inspected page or click <b>+ Sample Data</b> to preview.
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredRequests.map((item) => {
              const isError = item.hasGraphQLErrors || item.status >= 400;
              return (
                <div
                  key={item.id}
                  className={`request-row ${selectedItem?.id === item.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className={`op-badge op-${item.operationType}`}>
                    {badgeLabel(item.operationType)}
                  </span>
                  <span className="op-name" title={item.operationName}>
                    {item.operationName}
                  </span>
                  {item.batchTotal && (
                    <span className="batch-tag" title="Batched GraphQL request">
                      {item.batchIndex}/{item.batchTotal}
                    </span>
                  )}
                  <span className={`status-pill ${isError ? 'status-err' : 'status-ok'}`}>
                    {item.hasGraphQLErrors ? 'GQL ERR' : item.status}
                  </span>
                  <span className="duration-label">{item.durationMs} ms</span>
                </div>
              );
            })
          )}
        </aside>

        <div
          className={`split-divider ${isResizing ? 'dragging' : ''}`}
          onMouseDown={handleDividerMouseDown}
          onDoubleClick={() => {
            const container = splitPaneRef.current;
            if (!container) {
              setListWidth(DEFAULT_LIST_WIDTH);
              return;
            }
            const fitWidth = Math.min(
              DEFAULT_LIST_WIDTH,
              Math.max(MIN_LIST_WIDTH, container.getBoundingClientRect().width - MIN_DETAIL_WIDTH - DIVIDER_WIDTH)
            );
            setListWidth(fitWidth);
          }}
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize (double-click to reset)"
        />

        <main className="inspector-pane">
          {selectedItem ? (
            <>
              <div className="inspector-header">
                <div className="tabs">
                  <button
                    className={`tab-btn ${activeTab === 'query' ? 'active' : ''}`}
                    onClick={() => setActiveTab('query')}
                  >
                    Query
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'variables' ? 'active' : ''}`}
                    onClick={() => setActiveTab('variables')}
                  >
                    Variables
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'response' ? 'active' : ''}`}
                    onClick={() => setActiveTab('response')}
                  >
                    Response {selectedItem.hasGraphQLErrors ? '⚠️' : ''}
                  </button>
                </div>
                <div className="inspector-actions">
                  {activeTab === 'query' && !selectedItem.query.startsWith('# Persisted') && (
                    <button
                      className={`copy-btn ${formatQueries ? 'format-active' : ''}`}
                      onClick={() => setFormatQueries((prev) => !prev)}
                      title="Toggle Prettify / Raw GraphQL Query formatting"
                    >
                      {formatQueries ? 'Prettified' : 'Raw'}
                    </button>
                  )}
                  <span className="inspector-meta" title={selectedItem.url}>
                    {selectedItem.method} {selectedItem.url}
                  </span>
                  <button className="copy-btn" onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="inspector-body">
                <pre className="code-block">{activeContentString}</pre>
              </div>
            </>
          ) : (
            <div className="empty-state">Select a GraphQL operation on the left to inspect its details.</div>
          )}
        </main>
      </div>
    </div>
  );
};
