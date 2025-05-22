"use client";
import React from "react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "info" | "warning" | "error" | "success";
}

const Alert: React.FC<AlertProps> = ({ children, variant = "info", className, ...props }) => {
  let bgColor;
  switch (variant) {
    case "warning":
      bgColor = "bg-yellow-100 text-yellow-800";
      break;
    case "error":
      bgColor = "bg-red-100 text-red-800";
      break;
    case "success":
      bgColor = "bg-green-100 text-green-800";
      break;
    case "info":
    default:
      bgColor = "bg-blue-100 text-blue-800";
      break;
  }
  return (
    <div {...props} className={`p-4 rounded ${bgColor} ${className || ""}`}>
      {children}
    </div>
  );
};

export default Alert;
