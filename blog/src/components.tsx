import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useId,
} from 'react';

export type CalloutType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

const calloutIcons: Record<CalloutType, ReactNode> = {
  note: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v1" />
    </>
  ),
  tip: (
    <>
      <path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z" />
    </>
  ),
  important: (
    <>
      <path d="M4 3h16v14h-9l-4 4v-4H4ZM12 7v4m0 2v1" />
    </>
  ),
  warning: (
    <>
      <path d="m12 3 10 18H2ZM12 9v5m0 2v1" />
    </>
  ),
  caution: (
    <>
      <path d="m8 2-6 6v8l6 6h8l6-6V8l-6-6ZM12 7v6m0 3v1" />
    </>
  ),
};

export function Callout({
  type = 'note',
  children,
}: {
  type?: CalloutType | 'info';
  children: ReactNode;
}) {
  const kind = type === 'info' ? 'note' : type;
  const label = kind[0].toUpperCase() + kind.slice(1);
  return (
    <aside className={`callout callout-${kind}`} aria-label={label}>
      <strong className="callout-title">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {calloutIcons[kind]}
        </svg>
        {label}
      </strong>
      <div>{children}</div>
    </aside>
  );
}

export function Figure({
  src,
  alt,
  caption,
  width,
  height,
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function CodeBlock({ children, ...props }: ComponentProps<'pre'>) {
  const code = Children.toArray(children).find(isValidElement);
  const codeProps = code?.props as
    { className?: string; 'data-filename'?: string } | undefined;
  const className = codeProps?.className;
  const language = className?.match(/language-([\w+-]+)/)?.[1] ?? 'text';
  const filename = codeProps?.['data-filename'];
  return (
    <div className="code-block">
      <div className="code-toolbar">
        <div className="code-toolbar-labels">
          <span>{language}</span>
          {filename && <span className="code-filename">{filename}</span>}
        </div>
        <button type="button" data-copy aria-label={`Copy ${language} code`}>
          Copy
        </button>
      </div>
      <pre {...props} tabIndex={0}>
        {children}
      </pre>
      <span
        className="sr-only"
        data-copy-status
        role="status"
        aria-live="polite"
      />
    </div>
  );
}

type CodeTabProps = { label: string; children: ReactNode };

export function CodeTab({ label, children }: CodeTabProps) {
  return (
    <section className="code-tab-fallback">
      <h3 className="code-tab-heading">{label}</h3>
      {children}
    </section>
  );
}

export function CodeGroup({ children }: { children: ReactNode }) {
  const tabs = Children.toArray(children).filter(
    (child): child is ReactElement<CodeTabProps> =>
      isValidElement<CodeTabProps>(child) &&
      typeof child.props.label === 'string',
  );
  const id = useId();

  if (!tabs.length)
    throw new Error('CodeGroup requires at least one CodeTab child.');

  const entries = tabs.map((tab, index) => {
    const label = tab.props.label.trim();
    if (!label) throw new Error('CodeTab requires a non-empty label.');
    return {
      label,
      content: tab.props.children,
      tabId: `code-tab-${id}-${index}`,
      panelId: `code-panel-${id}-${index}`,
    };
  });

  return (
    <div className="code-group" data-code-group>
      <div
        className="code-group-tabs"
        role="tablist"
        aria-label="Code examples"
      >
        {entries.map((entry, index) => (
          <button
            key={entry.tabId}
            id={entry.tabId}
            type="button"
            role="tab"
            aria-selected={index === 0}
            aria-controls={entry.panelId}
            tabIndex={index === 0 ? 0 : -1}
            data-code-tab
          >
            {entry.label}
          </button>
        ))}
      </div>
      {entries.map((entry) => (
        <section
          key={entry.panelId}
          id={entry.panelId}
          role="tabpanel"
          aria-labelledby={entry.tabId}
          className="code-tab-panel"
          data-code-panel
        >
          <h3 className="code-tab-heading">{entry.label}</h3>
          {entry.content}
        </section>
      ))}
    </div>
  );
}

const endpointMethods = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'delete',
  HEAD: 'head',
  OPTIONS: 'options',
} as const;

export function ApiEndpoint({
  method,
  path,
}: {
  method: keyof typeof endpointMethods;
  path: string;
}) {
  if (!Object.hasOwn(endpointMethods, method))
    throw new Error(`Unsupported API method: ${String(method)}`);
  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    /[\s?#]/.test(path) ||
    [...path].some((character) => {
      const codePoint = character.charCodeAt(0);
      return codePoint < 32 || codePoint === 127;
    })
  )
    throw new Error('ApiEndpoint path must be a URL path starting with "/".');

  return (
    <span className="api-endpoint">
      <span
        className={`api-endpoint-method api-endpoint-${endpointMethods[method]}`}
      >
        {method}
      </span>
      <code className="api-endpoint-path">{path}</code>
    </span>
  );
}

function heading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  const Tag = `h${level}` as const;
  return function Heading({ id, children, ...props }: ComponentProps<'h2'>) {
    return (
      <Tag id={id} {...props}>
        {children}
        {id && (
          <a
            className="heading-anchor"
            href={`#${id}`}
            aria-label={`Link to ${typeof children === 'string' ? children : 'section'}`}
          >
            #
          </a>
        )}
      </Tag>
    );
  };
}

export const mdxComponents = {
  Callout,
  CodeGroup,
  CodeTab,
  ApiEndpoint,
  blockquote: ({
    children,
    'data-callout': type,
    ...props
  }: ComponentProps<'blockquote'> & { 'data-callout'?: CalloutType }) =>
    type ? (
      <Callout type={type}>{children}</Callout>
    ) : (
      <blockquote {...props}>{children}</blockquote>
    ),
  Figure,
  pre: CodeBlock,
  h1: heading(2),
  h2: heading(2),
  h3: heading(3),
  h4: heading(4),
  h5: heading(5),
  h6: heading(6),
  table: ({ children, ...props }: ComponentProps<'table'>) => (
    <div
      className="table-scroll"
      role="region"
      aria-label="Article table"
      tabIndex={0}
    >
      <table {...props}>{children}</table>
    </div>
  ),
  img: (props: ComponentProps<'img'>) => (
    <img {...props} loading="lazy" decoding="async" alt={props.alt ?? ''} />
  ),
};
