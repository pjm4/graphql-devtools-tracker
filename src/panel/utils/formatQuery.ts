/**
 * Lightweight, zero-dependency GraphQL query/mutation/subscription formatter.
 * Formats minified or unindented queries with consistent 2-space indentation,
 * line breaks around braces, and clean argument spacing.
 */
export function formatGraphQLQuery(query: string): string {
  if (!query || !query.trim()) return '';

  // Preserve leading comment-only or persisted query descriptions
  if (query.trim().startsWith('#')) {
    const lines = query.split('\n');
    const comments: string[] = [];
    let restStartIndex = lines.length;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#') || line === '') {
        comments.push(lines[i]);
      } else {
        restStartIndex = i;
        break;
      }
    }

    if (restStartIndex >= lines.length) {
      return query;
    }

    const restFormatted = formatGraphQLBody(lines.slice(restStartIndex).join('\n'));
    return [...comments, restFormatted].join('\n');
  }

  return formatGraphQLBody(query);
}

function formatGraphQLBody(raw: string): string {
  // Tokenize while respecting string literals ("...", """...""") and comments (#...)
  const tokens: string[] = [];
  let i = 0;
  const len = raw.length;

  while (i < len) {
    const ch = raw[i];

    // Skip whitespace & commas (commas are treated as whitespace in GraphQL)
    if (/\s/.test(ch) || ch === ',') {
      i++;
      continue;
    }

    // Comment
    if (ch === '#') {
      let end = raw.indexOf('\n', i);
      if (end === -1) end = len;
      tokens.push(raw.slice(i, end).trim());
      i = end;
      continue;
    }

    // Block string """..."""
    if (raw.startsWith('"""', i)) {
      let end = raw.indexOf('"""', i + 3);
      if (end === -1) end = len;
      else end += 3;
      tokens.push(raw.slice(i, end));
      i = end;
      continue;
    }

    // String literal "..."
    if (ch === '"') {
      let end = i + 1;
      while (end < len) {
        if (raw[end] === '\\') {
          end += 2;
        } else if (raw[end] === '"') {
          end++;
          break;
        } else {
          end++;
        }
      }
      tokens.push(raw.slice(i, end));
      i = end;
      continue;
    }

    // Structural single-char tokens
    if (['{', '}', '(', ')', '[', ']', ':', '$', '@', '='].includes(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }

    // Spread operator ...
    if (raw.startsWith('...', i)) {
      tokens.push('...');
      i += 3;
      continue;
    }

    // Word / identifier / number / directive token
    let end = i;
    while (
      end < len &&
      !/[\s,{}()\[\]:#$@=]/.test(raw[end]) &&
      !raw.startsWith('...', end)
    ) {
      end++;
    }
    tokens.push(raw.slice(i, end));
    i = end;
  }

  // Second pass: construct formatted indentation
  const INDENT_SPACES = '  ';
  let indentLevel = 0;
  let inParenDepth = 0;
  let result = '';

  const getIndent = () => INDENT_SPACES.repeat(indentLevel);

  for (let k = 0; k < tokens.length; k++) {
    const token = tokens[k];
    const prev = tokens[k - 1];
    const next = tokens[k + 1];

    if (token === '{') {
      if (result && !result.endsWith(' ') && !result.endsWith('\n')) {
        result += ' ';
      }
      result += '{\n';
      indentLevel++;
      result += getIndent();
      continue;
    }

    if (token === '}') {
      indentLevel = Math.max(0, indentLevel - 1);
      // Trim any trailing indent on the current line
      result = result.replace(/[ \t]+$/, '');
      if (!result.endsWith('\n')) {
        result += '\n';
      }
      result += getIndent() + '}';
      if (next && next !== '}' && next !== ')') {
        result += '\n' + getIndent();
      }
      continue;
    }

    if (token === '(') {
      inParenDepth++;
      result += '(';
      continue;
    }

    if (token === ')') {
      inParenDepth = Math.max(0, inParenDepth - 1);
      result += ')';
      if (next && next === '{') {
        result += ' ';
      }
      continue;
    }

    if (token === ':') {
      result += ': ';
      continue;
    }

    if (token === '=') {
      result += ' = ';
      continue;
    }

    if (token === '$' || token === '@') {
      if (prev && prev !== '(' && prev !== '{' && !result.endsWith('\n') && !result.endsWith(' ')) {
        result += ' ';
      }
      result += token;
      continue;
    }

    if (token.startsWith('#')) {
      if (result && !result.endsWith('\n')) {
        result += '\n' + getIndent();
      }
      result += token + '\n' + getIndent();
      continue;
    }

    // Formatting field lines: when at brace level and not inside argument parens
    if (
      inParenDepth === 0 &&
      prev &&
      prev !== '{' &&
      prev !== '(' &&
      prev !== ':' &&
      prev !== '$' &&
      prev !== '@' &&
      prev !== '=' &&
      prev !== 'query' &&
      prev !== 'mutation' &&
      prev !== 'subscription' &&
      prev !== 'fragment' &&
      prev !== 'on' &&
      prev !== '...' &&
      !result.endsWith('\n') &&
      !result.endsWith(getIndent())
    ) {
      // If previous token was an argument closing ')' or another field name, break to new line
      if (prev === ')' || next === '{' || token === '...') {
        // keep on flow or separate
      }
    }

    // Spacing between words
    if (
      result &&
      !result.endsWith('\n') &&
      !result.endsWith(' ') &&
      !result.endsWith('(') &&
      !result.endsWith('$') &&
      !result.endsWith('@') &&
      prev !== ':' &&
      prev !== '='
    ) {
      result += ' ';
    }

    result += token;

    // Line break after field names when next token is another field at same level
    if (
      inParenDepth === 0 &&
      next &&
      next !== '{' &&
      next !== '}' &&
      next !== '(' &&
      next !== ':' &&
      next !== '@' &&
      token !== 'query' &&
      token !== 'mutation' &&
      token !== 'subscription' &&
      token !== 'fragment' &&
      token !== 'on' &&
      token !== '...'
    ) {
      // If next token starts a new field (not inside args)
      if (next !== '{' && next !== '(') {
        result += '\n' + getIndent();
      }
    }
  }

  // Clean up any double blank lines
  return result
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}
