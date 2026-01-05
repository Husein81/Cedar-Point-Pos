import { Link, useMatches } from "@tanstack/react-router";
import { Shad } from "@repo/ui";

export function AppBreadcrumbs() {
  const matches = useMatches();

  const crumbs = matches
    .map((match) => {
      const breadcrumb = match.staticData.breadcrumb;
      if (!breadcrumb) return null;

      return {
        label:
          typeof breadcrumb === "function" ? breadcrumb(match) : breadcrumb,
        to: match.pathname,
      };
    })
    .filter(Boolean) as { label: string; to: string }[];

  if (!crumbs.length) return null;

  return (
    <Shad.Breadcrumb>
      <Shad.BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <Shad.BreadcrumbItem key={crumb.to}>
              {isLast ? (
                <span className="text-muted-foreground">{crumb.label}</span>
              ) : (
                <Shad.BreadcrumbLink asChild>
                  <Link to={crumb.to}>{crumb.label}</Link>
                </Shad.BreadcrumbLink>
              )}

              {!isLast && <Shad.BreadcrumbSeparator />}
            </Shad.BreadcrumbItem>
          );
        })}
      </Shad.BreadcrumbList>
    </Shad.Breadcrumb>
  );
}
