import { Breadcrumbs, Link, Stack } from "@mui/material";
import { links } from "./help-menu-links";

interface MenuLink {
  to: string;
  label: string;
  children?: MenuLink[];
}

interface Breadcrumb {
  to: string;
  label: string;
}

export default function HelpBreadcrumbs() {
  // letting links and path be any type for now, but could be changed in the future
  // need to fix the any path

  const findBreadcrumbs = (links: MenuLink[], path: string): Breadcrumb[] => {
    for (const link of links) {
      if (path.startsWith(link.to)) {
        if (link.to === path) {
          return [{ to: link.to, label: link.label }];
        }

        if (path.startsWith(link.to) && link.children) {
          const childBreadcrumbs = findBreadcrumbs(link.children, path);
          if (childBreadcrumbs.length > 0) {
            return [{ to: link.to, label: link.label }, ...childBreadcrumbs];
          }
        }
      }
    }
    return [];
  };

  const breadcrumbs: Breadcrumb[] = [
    { to: "/help", label: "All Categories" },
    ...findBreadcrumbs(links, location.pathname)
  ];

  return (
    <Stack spacing={2}>
      <Breadcrumbs separator=">">
        {breadcrumbs.map((breadcrumb: Breadcrumb, index: number) => (
          <Link key={index} href={breadcrumb.to} sx={{ width: "47px" }}>
            {breadcrumb.label}
          </Link>
        ))}
      </Breadcrumbs>
    </Stack>
  );
}
