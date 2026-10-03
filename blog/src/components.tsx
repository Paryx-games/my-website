import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactNode,
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
  const className = code && (code.props as { className?: string }).className;
  const language = className?.match(/language-([\w+-]+)/)?.[1] ?? 'text';
  return (
    <div className="code-block">
      <div className="code-toolbar">
        <span>{language}</span>
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
