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

const generatePath = (title: string, parentPath = ""): string => {
  const formattedTitle = title.toLowerCase().replace(/\s+/g, '-');
  return parentPath ? `${parentPath}/${formattedTitle}` : `/${formattedTitle}`;
};

// Tried fixing the ? in What is a chart, but I don't think it's working
const normalizePath = (path: string): string => {
  return path.split(/[?#]/)[0];
};

export default function NewBreadcrumbs() {
  const [notFound, setNotFound] = useState(false);
  const [fetchedData, setFetchedData] = useState<LinkPath[]>(defaultLinks);
  const currentPath = window.location.pathname.startsWith("/help") 
    ? window.location.pathname.substring("/help".length) 
    : window.location.pathname;

  // Grabbing data from "simulated server"
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetcher('/help-menu-json');
        
        // Check if response is successful and if content type is JSON
        if (!response.ok) {
          throw new Error(`Failed to load data. Status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Expected JSON response, but got something else.");
        }

        const data = await response.json();

        if (Array.isArray(data.links)) {
          setFetchedData(data.links);
        } else {
          throw new Error("Invalid data structure, expected 'links' array.");
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setFetchedData(defaultLinks);  // Fall back to default links
      }
    };

    loadData();
  }, []);

  const getAllPaths = (links: LinkPath[], parentPath = ""): Record<string, LinkPath> => {
    const result: Record<string, LinkPath> = {};
    
    links.forEach(link => {
      const path = generatePath(link.Title, parentPath);
      result[path] = link;
      
      if (link.Children && link.Children.length > 0) {
        const childPaths = getAllPaths(link.Children, path);
        Object.assign(result, childPaths);
      }
    });
    
    return result;
  };

  // This function builds breadcrumbs for a given path
  const buildBreadcrumbsForPath = (
    path: string,
    allPaths: Record<string, LinkPath>
  ): Breadcrumb[] => {
    const normalizedPath = normalizePath(path); // Normalize current path
    
    // If path exists directly, we need to build its ancestry
    if (allPaths[normalizedPath]) {
      const result: Breadcrumb[] = [];
      let currentPath = normalizedPath;
      
      // Keep extracting parent paths until we reach the root
      while (currentPath) {
        const link = allPaths[currentPath];
        if (!link) break;
        
        // Add this path to the beginning of our breadcrumbs
        result.unshift({
          to: currentPath,
          label: link.Title,
          content: link.Content
        });
        
        // Move up to parent path (remove last segment)
        const lastSlashIndex = currentPath.lastIndexOf('/');
        if (lastSlashIndex <= 0) {
          // We've reached the top level
          currentPath = "";
        } else {
          currentPath = currentPath.substring(0, lastSlashIndex);
        }
      }
      
      return result;
    }
    
    return [];
  };
  
  // Generate all possible paths
  const allPaths = getAllPaths(fetchedData);
  
  // Generate breadcrumbs for current path
  const pathBreadcrumbs = buildBreadcrumbsForPath(currentPath, allPaths);
  
  const breadcrumbs: Breadcrumb[] = [
    { to: "", label: "All Categories" },
    ...pathBreadcrumbs
  ];
  
  // For debugging
  useEffect(() => {
    console.log("All available paths:", Object.keys(allPaths));
    console.log("Current path:", currentPath);
    console.log("Generated breadcrumbs:", breadcrumbs);
  }, [fetchedData, currentPath]);
  
  useEffect(() => {
    setNotFound(breadcrumbs.length <= 1 && currentPath !== "" && currentPath !== "/");
  }, [breadcrumbs, currentPath]);

  if (notFound) {
    return <PageNotFound />;
  }

  // So that the pages does not reload when you click back on a breadcrumb
  const handleBreadcrumbClick = (breadcrumbPath: string, event: React.MouseEvent) => {
    event.preventDefault();
    // Update the URL without reloading the page
    window.history.pushState({}, '', `/help${breadcrumbPath}`);
    
    // Dispatch a popstate event to simulate a route change
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <Stack spacing={2}>
      <Breadcrumbs separator="&gt;">
        {breadcrumbs.map((breadcrumb: Breadcrumb, index: number) => (
          <Link 
            key={index} 
            href={`/help${breadcrumb.to}`} 
            onClick={(e) => handleBreadcrumbClick(breadcrumb.to, e)} 
            underline="always"
            color={index === breadcrumbs.length - 1 ? "text.primary" : "inherit"}
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
