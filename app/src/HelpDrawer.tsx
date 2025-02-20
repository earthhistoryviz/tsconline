
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
  content?: string;
}

// Generate paths consistently with parent path consideration
const generatePath = (title: string, parentPath = ""): string => {
  const formattedTitle = title.toLowerCase().replace(/\s+/g, '-');
  return parentPath ? `${parentPath}/${formattedTitle}` : `/${formattedTitle}`;
};


export default function NewBreadcrumbs() {
  const [notFound, setNotFound] = useState(false);
  const [fetchedData, setFetchedData] = useState<LinkPath[]>(defaultLinks);
  const currentPath = window.location.pathname.replace("/help", "");

  // Grabbing data from "simulated server"
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetcher('/help-menu-json');
        const data = await response.json();
        setFetchedData(data.links);
      } catch (error) {
        console.error("Error loading data:", error);
        setFetchedData(defaultLinks);
      }
    };

    loadData();
  }, []);

  const findBreadcrumbs = (
    links: LinkPath[], 
    currentPath: string, 
    parentPath = ""
  ): Breadcrumb[] => {
    for (const link of links) {
      const linkPath = generatePath(link.Title, parentPath);

      if (currentPath === linkPath) {
        return [{ to: linkPath, label: link.Title, content: link.Content }];
      }

      if (currentPath.startsWith(linkPath) && link.Children.length > 0) {
        const childBreadcrumbs = findBreadcrumbs(link.Children, currentPath, linkPath);

        if (childBreadcrumbs.length > 0) {
          return [{ to: linkPath, label: link.Title, content: link.Content}, ...childBreadcrumbs];
        }
      }
    }
    return [];
  };

  const breadcrumbs: Breadcrumb[] = [
    { to: "/help", label: "All Categories" },
    ...findBreadcrumbs(fetchedData, currentPath)
  ];

  console.log("Current Path:", currentPath);
  console.log("Generated Breadcrumbs:", breadcrumbs);

  // Remove this and you get a recursion error
  useEffect(() => {
    setNotFound(breadcrumbs.length <= 1);
  }, [breadcrumbs]);

  if (notFound) {
    return <PageNotFound />;
  }

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

      {breadcrumbs.length > 0 && (
        <div>
          <h2>{breadcrumbs[breadcrumbs.length-1].label}</h2>
          <p>{breadcrumbs[breadcrumbs.length-1].content}</p>
        </div>
      )}
    </Stack>
  );
}

