import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "citation";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  children,
  ...props
}) => {
  // Simple, reliable button styles
  let buttonStyle = "display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: 500; transition: all 0.2s; cursor: pointer; border: 1px solid transparent; outline: none; ";
  
  // Variant styles
  switch (variant) {
    case "primary":
      buttonStyle += "background-color: #3b82f6; color: white; ";
      break;
    case "secondary":
      buttonStyle += "background-color: #f3f4f6; color: #374151; ";
      break;
    case "outline":
      buttonStyle += "background-color: transparent; color: #374151; border-color: #d1d5db; ";
      break;
    case "ghost":
      buttonStyle += "background-color: transparent; color: #374151; ";
      break;
    case "citation":
      buttonStyle += "background-color: #ede9fe; color: #7c3aed; border-color: #c4b5fd; font-size: 12px; padding: 4px 8px; border-radius: 9999px; ";
      break;
  }
  
  // Size styles
  if (variant !== "citation") {
    switch (size) {
      case "sm":
        buttonStyle += "height: 32px; padding: 0 12px; font-size: 14px; ";
        break;
      case "md":
        buttonStyle += "height: 40px; padding: 8px 16px; font-size: 14px; ";
        break;
      case "lg":
        buttonStyle += "height: 48px; padding: 0 32px; font-size: 16px; ";
        break;
    }
  }
  
  // Disabled styles
  if (disabled || isLoading) {
    buttonStyle += "opacity: 0.5; cursor: not-allowed; ";
  }

  return (
    <button
      style={{
        ...Object.fromEntries(buttonStyle.split('; ').filter(s => s).map(s => s.split(': '))),
      }}
      className={className}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <Loader2 
          style={{ 
            marginRight: '8px', 
            width: '16px', 
            height: '16px',
            animation: 'spin 1s linear infinite'
          }} 
        />
      )}
      {children}
    </button>
  );
};

export { Button };
