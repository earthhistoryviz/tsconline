import { useState, useEffect } from 'react';
import { Breadcrumbs, Link, Stack } from "@mui/material";
import { useLocation } from 'react-router-dom'; // Import useLocation
import { links as defaultLinks } from "./help-menu-json";
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
  const location = useLocation(); // Use location hook to get current path
  const [fetchedData, setFetchedData] = useState<LinkPath[]>(defaultLinks);
  const [content, setContent] = useState<string>("");
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  // Fetch the data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch("/help-menu-json"); // Simulating fetching from a JSON
        const data = await response.json();
        setFetchedData(data.links);
      } catch (error) {
        console.error("Error loading data:", error);
        setFetchedData(defaultLinks);
      }
    };

    loadData();
  }, []);

  // Generate the breadcrumb trail based on the URL path
  const generatePath = (title: string): string => {
    return `/help/${title.toLowerCase().replace(/\s+/g, '-')}`;
  };

  // Find breadcrumbs based on the current path
  const findBreadcrumbs = (links: LinkPath[], currentPath: string): Breadcrumb[] => {
    for (const link of links) {
      const linkPath = generatePath(link.Title);

      if (currentPath === linkPath) {
        setContent(link.Content); // Set content for this page
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

  // Update breadcrumbs and content based on current location
  useEffect(() => {
    const currentPath = location.pathname;
    const breadcrumbTrail = findBreadcrumbs(fetchedData, currentPath);

    if (breadcrumbTrail.length > 0) {
      setBreadcrumbs([
        { to: "/help", label: "All Categories" },
        ...breadcrumbTrail
      ]);
    } else {
      setBreadcrumbs([{ to: "/help", label: "All Categories" }]);
      setContent(""); // Clear content if no match found
    }
  }, [fetchedData, location.pathname]); // Re-run when location or fetched data changes

  return (
    <Stack spacing={2}>
      <Breadcrumbs separator=">">
        {breadcrumbs.map((breadcrumb, index) => (
          <Link key={index} href={breadcrumb.to}>
            {breadcrumb.label}
          </Link>
        ))}
      </Breadcrumbs>

      {/* Render content dynamically or 404 page */}
      {content ? <div>{content}</div> : <PageNotFound />}
    </Stack>
  );
}
