import { Breadcrumbs, Link, Stack } from '@mui/material'; // Assuming you are using Material-UI
import { links } from "./HelpMenuLinks";


export default function HelpBreadcrumbs() {

  const findBreadcrumbs = (links, path) => {
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

  const breadcrumbs = findBreadcrumbs(links, location.pathname);

  return (
    <Stack spacing={2}>
      <Breadcrumbs separator=">">
        {breadcrumbs.map((breadcrumb, index) => (
          <Link key={index} href={breadcrumb.to}>
            {breadcrumb.label}
          </Link>
        ))}
      </Breadcrumbs>
    </Stack>
  );
}