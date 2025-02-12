import { Breadcrumbs, Link, Stack } from "@mui/material";
import { useState, useEffect } from 'react';
import { links } from "./help-menu-json"

interface LinkPath {
  Title: string;
  Content: string;
  Children: LinkPath[];
}

interface Breadcrumb {
  to: string;
  label: string;
}

export default function NewBreadcrumbs() {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
    { to: "/help", label: "All Categories" }
  ]);

  const titleToPath = (title: string): string => {
    return title.replace(/\s+/g, '-');
  };

  const findBreadcrumbs = (
    links: LinkPath[], 
    currentPath: string, 
    parentPath: string = "/help"
  ): Breadcrumb[] => {
    for (const link of links) {
      const linkPath = `${parentPath}/${titleToPath(link.Title)}`;
      
      if (currentPath === linkPath) {
        return [{
          to: linkPath,
          label: link.Title
        }];
      }

      if (link.Children && link.Children.length > 0) {
        const childPath = findBreadcrumbs(link.Children, currentPath, linkPath);
        
        if (childPath.length > 0) {
          return [{
            to: linkPath,
            label: link.Title
          }, ...childPath];
        }
      }
    }
    return [];
  };

  useEffect(() => {
    const currentPath = window.location.pathname;
    const pathBreadcrumbs = findBreadcrumbs(links, currentPath);
    
    setBreadcrumbs([
      { to: "/help", label: "All Categories" },
      ...pathBreadcrumbs
    ]);
  }, [window.location.pathname]);

  return (
    <Stack spacing={2}>
      <Breadcrumbs separator=">">
        {breadcrumbs.map((breadcrumb: Breadcrumb, index: number) => (
          <Link 
            key={index} 
            href={breadcrumb.to} 
            sx={{ width: "47px" }}
          >
            {breadcrumb.label}
          </Link>
        ))}
      </Breadcrumbs>
    </Stack>
  );
}