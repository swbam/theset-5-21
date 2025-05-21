import * as React from "react";
import { cn } from "@/lib/utils";

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

/**
 * A custom Link component that can be used across the application.
 * This component allows for consistent styling and behavior across the app.
 */
export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, children, className, asChild = false, ...props }, ref) => {
    // For client-side navigation, we would normally use Next.js Link component
    // But since we're having issues with its import, we'll use a regular anchor tag
    // with proper styling and behavior
    return (
      <a
        ref={ref}
        href={href}
        className={cn(
          "text-primary hover:underline hover:text-primary/90 transition-colors",
          className
        )}
        {...props}
      >
        {children}
      </a>
    );
  }
);

Link.displayName = "Link"; 