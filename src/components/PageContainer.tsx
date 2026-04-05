import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "default" | "full" | "narrow";
  noPadding?: boolean;
}

export function PageContainer({ 
  children, 
  className = "", 
  maxWidth = "default",
  noPadding = false
}: PageContainerProps) {
  const maxWidthClass = {
    default: "max-w-7xl", // 1280px
    full: "max-w-full",
    narrow: "max-w-4xl" // 896px
  }[maxWidth];

  return (
    <div className={`
      w-full mx-auto
      ${maxWidthClass}
      ${noPadding ? '' : 'px-4 sm:px-6 lg:px-8'}
      ${className}
    `}>
      {children}
    </div>
  );
}
