
// This is a shim for Next.js Link component
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface LinkProps {
  href: string;
  as?: string;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  prefetch?: boolean;
  locale?: string | false;
  legacyBehavior?: boolean;
  onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLAnchorElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}

export default function Link({
  href,
  as,
  replace,
  scroll,
  passHref,
  shallow,
  prefetch,
  locale,
  legacyBehavior,
  children,
  ...props
}: LinkProps) {
  // Determine if this is an external link
  const isExternal = 
    href.startsWith('http') || 
    href.startsWith('//') || 
    props.target === '_blank';

  // For external links, use standard <a> tag
  if (isExternal) {
    return React.createElement(
      'a',
      { href, target: props.target || '_blank', rel: props.rel || 'noopener noreferrer', ...props },
      children
    );
  }

  // For internal links, use react-router's Link
  return React.createElement(
    RouterLink,
    { to: href, replace, ...props },
    children
  );
}
