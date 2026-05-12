export const rules = [
  {
    id: 'react/no-index-key',
    title: 'Unstable index key in mapped list',
    severity: 'error',
    rationale: 'AI-generated components often use array indexes as keys. This can corrupt UI state when lists reorder, insert, or delete items.',
    pattern: /key\s*=\s*{\s*(index|i|idx)\s*}/g,
    suggestion: 'Use a stable domain identifier, such as item.id, slug, or database primary key.'
  },
  {
    id: 'react/no-derived-state-effect',
    title: 'useEffect appears to derive state from props or local state',
    severity: 'warning',
    rationale: 'Derived state inside effects often causes extra renders, stale values, and fragile agent-written code.',
    pattern: /useEffect\s*\(\s*\(\s*\)\s*=>\s*{[\s\S]{0,260}set[A-Z][A-Za-z0-9_]*\s*\(/g,
    suggestion: 'Prefer computing derived values during render with constants, useMemo, or selectors.'
  },
  {
    id: 'next/no-server-import-in-client-component',
    title: 'Client component imports server-only APIs',
    severity: 'error',
    rationale: 'AI agents frequently cross Next.js server/client boundaries. Server-only imports in client components can break builds or leak assumptions.',
    detector: detectServerImportInClient,
    suggestion: 'Move server logic to a server component, route handler, server action, or API boundary.'
  },
  {
    id: 'a11y/button-missing-type',
    title: 'Button missing explicit type',
    severity: 'warning',
    rationale: 'Buttons inside forms default to submit. AI-generated UI often omits type and creates accidental submissions.',
    pattern: /<button(?![^>]*\btype=)[^>]*>/g,
    suggestion: 'Use type="button" for ordinary buttons or type="submit" intentionally.'
  },
  {
    id: 'a11y/img-missing-alt',
    title: 'Image missing alt text',
    severity: 'error',
    rationale: 'Missing alt text is an accessibility regression and common in generated UI.',
    pattern: /<img(?![^>]*\balt=)[^>]*>/g,
    suggestion: 'Add meaningful alt text, or alt="" for decorative images.'
  },
  {
    id: 'security/dangerous-html',
    title: 'dangerouslySetInnerHTML used without an obvious sanitizer',
    severity: 'error',
    rationale: 'Generated code can insert unsafe HTML paths without threat modeling.',
    detector: detectDangerousHtml,
    suggestion: 'Avoid raw HTML. If required, sanitize with a reviewed sanitizer and document the trusted source.'
  },
  {
    id: 'next/hydration-browser-global-in-render',
    title: 'Browser global used during render',
    severity: 'error',
    rationale: 'Direct window/document/localStorage access during render can cause hydration mismatches in Next.js.',
    detector: detectBrowserGlobalInRender,
    suggestion: 'Move browser-only reads into useEffect or guard with client-only rendering.'
  },
  {
    id: 'agent/placeholder-logic',
    title: 'Placeholder or fake implementation left in code',
    severity: 'error',
    rationale: 'AI agents often leave TODOs, mocks, fake handlers, or placeholder branches that look complete in demos.',
    pattern: /^[^\n]*\b(TODO|FIXME|placeholder|mock data|fake data|replace this|implement later|coming soon)\b[^\n]*/gim,
    suggestion: 'Replace placeholder logic with real behavior or fail loudly until implemented.'
  },
  {
    id: 'agent/suspicious-empty-catch',
    title: 'Suspicious empty catch block',
    severity: 'warning',
    rationale: 'Empty catch blocks hide failures and are a common generated-code smell.',
    pattern: /catch\s*\([^)]*\)\s*{\s*}/g,
    suggestion: 'Handle the error, log intentionally, or rethrow with context.'
  },
  {
    id: 'agent/console-leftover',
    title: 'Console statement left in component code',
    severity: 'warning',
    rationale: 'Console logs are often leftover scaffolding from generated or debugged code.',
    pattern: /console\.(log|debug|warn|error)\s*\(/g,
    suggestion: 'Remove debug logs or replace with your application logger intentionally.'
  }
];

function detectServerImportInClient(source) {
  if (!/^\s*['\"]use client['\"];?/m.test(source)) return [];
  const matches = [];
  const importPattern = /import\s+(?:[^'\"]+\s+from\s+)?['\"]([^'\"]+)['\"]/g;
  let match;
  const serverOnly = ['fs', 'path', 'crypto', 'server-only', 'next/headers', 'next/cache'];
  while ((match = importPattern.exec(source))) {
    if (serverOnly.some((name) => match[1] === name || match[1].startsWith(`${name}/`))) {
      matches.push({ index: match.index, text: match[0] });
    }
  }
  return matches;
}

function detectDangerousHtml(source) {
  if (!source.includes('dangerouslySetInnerHTML')) return [];
  const sanitizerNearby = /DOMPurify|sanitizeHtml|sanitize\(/.test(source);
  if (sanitizerNearby) return [];
  const matches = [];
  const pattern = /dangerouslySetInnerHTML\s*=\s*{{[\s\S]{0,180}}}/g;
  let match;
  while ((match = pattern.exec(source))) matches.push({ index: match.index, text: match[0] });
  return matches;
}

function detectBrowserGlobalInRender(source) {
  const matches = [];
  const renderRisk = /(const|let|var)\s+\w+\s*=\s*(window|document|localStorage|sessionStorage)\b|return\s*\([\s\S]{0,500}\b(window|document|localStorage|sessionStorage)\b/g;
  let match;
  while ((match = renderRisk.exec(source))) {
    const before = source.slice(Math.max(0, match.index - 180), match.index);
    if (!/useEffect\s*\([^)]*$/.test(before)) matches.push({ index: match.index, text: match[0] });
  }
  return matches;
}
