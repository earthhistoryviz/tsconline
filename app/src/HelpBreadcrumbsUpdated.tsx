import { useState, useEffect } from "react";
import { Breadcrumbs, Link, Stack, Typography } from "@mui/material";
import { links as defaultLinks } from "./components/help-menu-json";
import { fetcher } from "./util";
import { PageNotFound } from "./PageNotFound";
import { useLocation, useNavigate } from "react-router";
import { useTheme } from "@mui/material/styles";

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

const normalizeForComparison = (path: string): string => {
  return decodeURIComponent(path)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-") // Replace multiple hyphens with a single one
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
};

// The Helper function
const isLinkValid = (path: string, allPaths: Record<string, LinkPath>, pathMap: Record<string, string>): boolean => {
  const fullPath = path.startsWith("/help") ? path : "/help" + path;
  const normalizedSearchPath = normalizeForComparison(fullPath);
  return Object.keys(pathMap).some((key) => normalizedSearchPath === key);
};

const generatePath = (title: string, parentPath = ""): string => {
  const encoded = encodeURIComponent(title);
  return parentPath ? `${parentPath}/${encoded}` : `/${encoded}`;
};

export default function NewBreadcrumbs() {
  const [notFound, setNotFound] = useState(false);
  const [fetchedData, setFetchedData] = useState<LinkPath[]>(defaultLinks);
  const theme = useTheme();

  const currentPath = useLocation().pathname;
  const navigate = useNavigate();

  // Grabbing data from "simulated server"
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetcher("/help-menu-json");

        // Check if response is successful and if content type is JSON
        if (!response.ok) {
          throw new Error(`Failed to load data. Status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Expected JSON response, but got something else.");
        }

        const data = await response.json();

        // Leave this in because I am fetching from the server and not the actual content
        if (Array.isArray(data.links)) {
          setFetchedData(data.links);
        } else {
          throw new Error("Invalid data structure, expected 'links' array.");
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setFetchedData(defaultLinks);
      }
    };

    loadData();
  }, []);

  const getAllPaths = (links: LinkPath[], parentPath = "/help"): [Record<string, LinkPath>, Record<string, string>] => {
    const result: Record<string, LinkPath> = {};
    const normalizedMap: Record<string, string> = {};

    links.forEach((link) => {
      const path = generatePath(link.Title, parentPath);
      result[path] = link;

      const normalizedPath = normalizeForComparison(path);
      normalizedMap[normalizedPath] = path;

      if (link.Children && link.Children.length > 0) {
        const [childPaths, childNormalizedMap] = getAllPaths(link.Children, path);
        Object.assign(result, childPaths);
        Object.assign(normalizedMap, childNormalizedMap);
      }
    });

    return [result, normalizedMap];
  };

  const buildBreadcrumbsForPath = (
    path: string,
    allPaths: Record<string, LinkPath>,
    pathMap: Record<string, string>
  ): Breadcrumb[] => {
    const fullPath = path.startsWith("/help") ? path : "/help" + path;
    const normalizedSearchPath = normalizeForComparison(fullPath);

    const matchingOriginalPath = pathMap[normalizedSearchPath];

    if (!matchingOriginalPath) {
      console.log("No matching path found");
      return [];
    }

    const result: Breadcrumb[] = [];
    let currentPath = matchingOriginalPath;

    while (currentPath && currentPath !== "/help") {
      const link = allPaths[currentPath];

      if (link) {
        // Add this path to the beginning of our breadcrumbs
        result.unshift({
          to: currentPath.substring(5), // Remove /help for navigation
          label: link.Title,
          content: link.Content
        });
      }

      // Move up to parent path (remove last segment)
      const lastSlashIndex = currentPath.lastIndexOf("/");
      currentPath = lastSlashIndex <= 5 ? "/help" : currentPath.substring(0, lastSlashIndex);
    }

    return result;
  };

  const [allPaths, pathMap] = getAllPaths(fetchedData);
  const pathBreadcrumbs = buildBreadcrumbsForPath(currentPath, allPaths, pathMap);
  const breadcrumbs: Breadcrumb[] = [{ to: "", label: "All Categories" }, ...pathBreadcrumbs];
  const isValidPath = isLinkValid(currentPath, allPaths, pathMap);

  useEffect(() => {
    setNotFound(!isValidPath && currentPath !== "/help");
  }, [isValidPath, currentPath]);

  const handleBreadcrumbClick = (breadcrumbPath: string, event: React.MouseEvent) => {
    event.preventDefault();
    navigate(`/help${breadcrumbPath}`);
  };

  if (notFound) {
    return <PageNotFound />;
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={2}>
        <Breadcrumbs
          separator={<span style={{ color: theme.palette.button.main }}>{">"}</span>}
          sx={{ color: theme.palette.button.main }}>
          {breadcrumbs.map((breadcrumb: Breadcrumb, index: number) => (
            <Link
              key={index}
              href={`/help${breadcrumb.to}`}
              onClick={(e) => handleBreadcrumbClick(breadcrumb.to, e)}
              underline="always"
              sx={{ color: theme.palette.button.main }}>
              {breadcrumb.label}
            </Link>
          ))}
        </Breadcrumbs>
      </Stack>

      {breadcrumbs.length > 0 && (
        <div>
          <Typography variant="h4">{breadcrumbs[breadcrumbs.length - 1].label}</Typography>
          <Typography variant="body1">{breadcrumbs[breadcrumbs.length - 1].content}</Typography>
        </div>
      )}
    </Stack>
  );
}
