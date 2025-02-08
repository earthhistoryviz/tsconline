import { Breadcrumbs, Link, Stack } from "@mui/material";
import { links } from "./help-menu-links";

export default function HelpBreadcrumbs() {
  // letting links and path be any type for now, but could be changed in the future
  const findBreadcrumbs = (links: any, path: any) => {
    for (let link of links) {
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

  const breadcrumbs = [{ to: "/help", label: "All Categories" }, ...findBreadcrumbs(links, location.pathname)];

  return (
    <Stack spacing={2}>
      <Breadcrumbs separator=">">
        {/* Setting breadcrumb and index as any type for now */}
        {breadcrumbs.map((breadcrumb: any, index: any) => (
          <Link key={index} href={breadcrumb.to} sx={{ width: "47px" }}>
            {breadcrumb.label}
          </Link>
        ))}
      </Breadcrumbs>
    </Stack>
  );
}
