// Renders a LaTeX string with KaTeX. Falls back to raw text if rendering fails.
import { useMemo } from "react";
import katex from "katex";

interface KatexProps {
  latex: string;
  block?: boolean;
  ariaLabel?: string;
}

export function Katex({ latex, block = false, ariaLabel }: KatexProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode: block,
        throwOnError: false,
      });
    } catch {
      return null;
    }
  }, [latex, block]);

  if (html === null) {
    return <code aria-label={ariaLabel}>{latex}</code>;
  }
  return (
    <span
      aria-label={ariaLabel ?? latex}
      // eslint-disable-next-line react/no-danger -- KaTeX output is sanitized by throwOnError:false + trusted input
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
