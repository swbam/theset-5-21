import * as React from "react";
import { cn } from "@/lib/utils"; // Assuming you have a utility for merging class names

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  // Add any specific props for the container if needed in the future
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", // Standard container padding and max-width
          className // Allow overriding or adding classes
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Container.displayName = "Container";

export { Container };