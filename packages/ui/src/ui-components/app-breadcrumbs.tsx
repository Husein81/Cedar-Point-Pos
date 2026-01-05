import { Link, useLocation } from "@tanstack/react-router";
import { Shad } from "@repo/ui";

function formatLabel(segment: string) {
  // product-details → Product Details
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AppBreadcrumbs() {
  const { pathname } = useLocation();

  const segments = pathname.split("/").filter(Boolean); // remove empty parts

  const crumbs = segments.map((segment, index) => {
    const to = "/" + segments.slice(0, index + 1).join("/");

    return {
      label: formatLabel(segment),
      to,
    };
  });

  if (crumbs.length === 0) return null;

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
