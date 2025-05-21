
// This is a shim for Next.js Image component
import React from 'react';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loader?: any;
  quality?: number;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  unoptimized?: boolean;
  objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
  objectPosition?: string;
  lazyBoundary?: string;
  lazyRoot?: React.RefObject<HTMLElement>;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
  fill?: boolean;
}

export default function Image({
  src,
  alt,
  width,
  height,
  className,
  style,
  fill,
  ...props
}: ImageProps) {
  // Convert fill layout to standard CSS
  const imgStyle: React.CSSProperties = {
    ...(fill
      ? {
          position: 'absolute',
          height: '100%',
          width: '100%',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          objectFit: 'cover',
        }
      : {}),
    ...style,
  };

  // For blur placeholder
  const blurStyle = props.placeholder === 'blur' && props.blurDataURL
    ? {
        backgroundSize: 'cover',
        backgroundPosition: '0% 0%',
        backgroundImage: `url(${props.blurDataURL})`,
      }
    : {};

  return React.createElement(
    'img',
    {
      src,
      alt,
      width,
      height,
      className,
      style: { ...imgStyle, ...blurStyle },
      loading: props.priority ? 'eager' : 'lazy',
    }
  );
}
