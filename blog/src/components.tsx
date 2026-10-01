import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from 'react';

export function Callout({
  type = 'info',
  children,
}: {
  type?: 'info' | 'warning' | 'tip';
  children: ReactNode;
}) {
  return (
    <aside className={`callout callout-${type}`} aria-label={`${type} note`}>
      <strong>
        {type === 'info' ? 'Note' : type === 'tip' ? 'Tip' : 'Worth knowing'}
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
