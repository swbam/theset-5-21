"use client";
import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div {...props} className={`border rounded p-4 shadow ${className || ""}`}>
      {children}
    </div>
  );
};

export default Card;
