/**
 * Shared layout components — adapted from job-ops design system.
 */

import { type LucideIcon, Menu } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { APP_ICON, APP_NAME, NAV_LINKS, isNavActive } from "./navigation";

// ============================================================================
// Page Header
// ============================================================================

interface PageHeaderProps {
  icon?: LucideIcon | React.FC<{ className?: string }>;
  title: string;
  subtitle: string;
  badge?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const AppIcon = APP_ICON;

  const handleNavClick = (to: string) => {
    if (isNavActive(location.pathname, to)) {
      setNavOpen(false);
      return;
    }
    setNavOpen(false);
    setTimeout(() => navigate(to), 150);
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 flex flex-col">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <AppIcon className="h-5 w-5 text-primary" />
                  {APP_NAME}
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-2">
                {NAV_LINKS.map(({ to, label, icon: NavIcon }) => (
                  <button
                    key={to}
                    type="button"
                    onClick={() => handleNavClick(to)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-left",
                      isNavActive(location.pathname, to)
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <NavIcon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {Icon ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-muted/30">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : null}

          <div className="min-w-0 leading-tight">
            <div className="text-sm font-semibold tracking-tight">{title}</div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          </div>

          {badge && (
            <Badge variant="outline" className="uppercase tracking-wide">
              {badge}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">{actions}</div>
      </div>
    </header>
  );
};

// ============================================================================
// Page Main Content Wrapper
// ============================================================================

interface PageMainProps {
  children: React.ReactNode;
  className?: string;
}

export const PageMain: React.FC<PageMainProps> = ({ children, className }) => (
  <main className={cn("container mx-auto max-w-7xl space-y-6 px-4 py-6 pb-12", className)}>
    {children}
  </main>
);

// ============================================================================
// Section Card
// ============================================================================

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  children,
  className,
  title,
  description,
  actions,
}) => (
  <section className={cn("rounded-xl border border-border/60 bg-card/40 p-4", className)}>
    {(title || actions) && (
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
    {Icon && <Icon className="h-10 w-10 text-muted-foreground/50 mb-2" />}
    <div className="text-base font-semibold">{title}</div>
    {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

// ============================================================================
// Split Layout
// ============================================================================

interface SplitLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const SplitLayout: React.FC<SplitLayoutProps> = ({ children, className }) => (
  <section
    className={cn("grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]", className)}
  >
    {children}
  </section>
);
