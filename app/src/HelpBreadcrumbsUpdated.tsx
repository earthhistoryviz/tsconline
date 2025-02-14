import { useState, useEffect } from 'react';
import { Breadcrumbs, Link, Stack } from "@mui/material";
import { links as defaultLinks } from "./help-menu-json";
import { fetcher } from "./util";
import { PageNotFound } from "./PageNotFound";

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
  // Use this for the 404 error page
  const [notFound, setNotFound] = useState(false);
  const [fetchedData, setFetchedData] = useState<LinkPath[]>(defaultLinks);

  // Fetching the data from the server (in reality it's just a json file)
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetcher('/help-menu-json');
        const data = await response.json();
        setFetchedData(data.links);
      } 
      catch (error) {
        console.error("Error loading data:", error);
        setFetchedData(defaultLinks);
      }
    };

    loadData();
  }, []);


  const generatePath = (title: string): string => {
    return `/help/${title.toLowerCase().replace(/\s+/g, '-')}`;
  };

  {/* Transforms the whole JSON structure from the useEffect into a queried */}
  const findBreadcrumbs = (links: LinkPath[], currentPath: string): Breadcrumb[] => {
    for (const link of links) {
      const linkPath = generatePath(link.Title);
      
      if (currentPath === linkPath) {
        return [{ to: linkPath, label: link.Title }];
      }

      if (currentPath.startsWith(linkPath) && link.Children && link.Children.length > 0) {
        const childBreadcrumbs = findBreadcrumbs(link.Children, currentPath);
        if (childBreadcrumbs.length > 0) {
          return [{ to: linkPath, label: link.Title }, ...childBreadcrumbs];
        }
      }
    }
    return [];
  };
  
  const breadcrumbs: Breadcrumb[] = [
    { to: "/help", label: "All Categories" },
    ...findBreadcrumbs(fetchedData, location.pathname)
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