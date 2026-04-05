import { ChevronRight, Home } from "lucide-react";
import { Button } from "./ui/button";

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  current?: boolean;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function BreadcrumbNav({ items, showHome = true, className = "" }: BreadcrumbNavProps) {
  const allItems = showHome 
    ? [{ label: "Home", href: "home", onClick: () => {} }, ...items]
    : items;

  return (
    <nav aria-label="Navegação estrutural" className={`hidden ${className}`}>
      {allItems.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" aria-hidden="true" />
          )}
          
          {item.current ? (
            <span 
              className="text-foreground font-medium"
              aria-current="page"
            >
              {index === 0 && showHome ? (
                <div className="flex items-center gap-1">
                  <Home className="w-4 h-4" aria-hidden="true" />
                  <span className="sr-only">{item.label}</span>
                </div>
              ) : (
                item.label
              )}
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-muted-foreground hover:text-foreground"
              onClick={item.onClick}
              aria-label={`Navegar para ${item.label}`}
            >
              {index === 0 && showHome ? (
                <div className="flex items-center gap-1">
                  <Home className="w-4 h-4" aria-hidden="true" />
                  <span className="sr-only">{item.label}</span>
                </div>
              ) : (
                item.label
              )}
            </Button>
          )}
        </div>
      ))}
    </nav>
  );
}