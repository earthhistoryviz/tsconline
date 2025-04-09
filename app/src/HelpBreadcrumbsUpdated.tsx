import { useState, useEffect } from "react";
import { Breadcrumbs, Link, Stack, Typography } from "@mui/material";
import { fetcher } from "./util";
import { PageNotFound } from "./PageNotFound";
import { useLocation, useNavigate } from "react-router";
import { useTheme } from "@mui/material/styles";

interface LinkPath {
  title: string;
  content: string;
  children: LinkPath[];
}

interface Breadcrumb {
  to: string;
  label: string;
  content?: string;
}

// New interface here so as to not double map
interface PathEntry {
  link: LinkPath;
  fullPath: string;
  parentPath?: string;
}

const links: LinkPath[] = [
  {
    title: "Presets",
    content: "Insert md file",
    children: []
  },
  {
    title: "Datapacks",
    content: "Insert md file",
    children: []
  },
  {
    title: "Chart",
    content: "Insert md file",
    children: [
      {
        title: "What is a Chart?",
        content: "Insert md file",
        children: []
      },
      {
        title: "Column Variants",
        content: "Insert md file",
        children: [
          {
            title: "Block Columns",
            content: "Insert md file",
            children: []
          },
          {
            title: "Point Columns",
            content: "Insert md file",
            children: []
          },
          {
            title: "Event columns",
            content: "Insert md file",
            children: [
              {
                title: "Dual column comparison",
                content: "Insert md file",
                children: []
              },
              {
                title: "Data Mining",
                content: "Insert md file",
                children: []
              }
            ]
          },
          {
            title: "Freehand Columns",
            content: "Insert md file",
            children: []
          }
        ]
      },
      {
        title: "Saving a Chart",
        content: "Insert md file",
        children: []
      }
    ]
  },
  {
    title: "Settings",
    content: "Insert md file",
    children: []
  },
  {
    title: "Help",
    content: "Insert md file",
    children: []
  },
  {
    title: "Workshops",
    content: "Insert md file",
    children: []
  },
  {
    title: "Options",
    content: "Insert md file",
    children: []
  }
];

const generatePath = (title: string, parentPath = ""): string => {
  const encoded = encodeURIComponent(title);
  return `${parentPath}/${encoded}`;
};

const normalizeForComparison = (path: string): string => {
  return decodeURIComponent(path)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

// moved this up
const getAllPaths = (
  links: LinkPath[],
  parentFullPath = "/help",
  parentNormalizedPath = ""
): Record<string, PathEntry> => {
  const result: Record<string, PathEntry> = {};

  links.forEach((link) => {
    const fullPath = generatePath(link.title, parentFullPath);
    const normalizedPath = normalizeForComparison(fullPath);

    result[normalizedPath] = {
      link,
      fullPath,
      parentPath: parentNormalizedPath || undefined
    };

    if (link.children?.length > 0) {
      const childPaths = getAllPaths(link.children, fullPath, normalizedPath);
      Object.assign(result, childPaths);
    }
  });

  return result;
};

const buildBreadcrumbsForPath = (path: string, allPaths: Record<string, PathEntry>): Breadcrumb[] => {
  const fullPath = path.startsWith("/help") ? path : "/help" + path;
  const normalizedSearchPath = normalizeForComparison(fullPath);
  const breadcrumbs: Breadcrumb[] = [];
  let currentPath = normalizedSearchPath;

  while (currentPath && allPaths[currentPath]) {
    const entry = allPaths[currentPath];
    breadcrumbs.unshift({
      to: entry.fullPath.substring(5),
      label: entry.link.title,
      content: entry.link.content
    });
    currentPath = entry.parentPath || "";
  }

  return breadcrumbs;
};

const isLinkValid = (path: string, allPaths: Record<string, PathEntry>): boolean => {
  const fullPath = path.startsWith("/help") ? path : "/help" + path;
  const normalizedSearchPath = normalizeForComparison(fullPath);
  return normalizedSearchPath in allPaths;
};

export default function NewBreadcrumbs() {
  const [notFound, setNotFound] = useState(false);
  const [fetchedData, setFetchedData] = useState<LinkPath[]>(links);
  const theme = useTheme();

  const currentPath = useLocation().pathname;
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetcher("/help-menu-json");

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
        setFetchedData(links);
      }
    };

    loadData();
  }, []);

  const allPaths = getAllPaths(fetchedData);
  const pathBreadcrumbs = buildBreadcrumbsForPath(currentPath, allPaths);
  const breadcrumbs: Breadcrumb[] = [{ to: "", label: "All Categories" }, ...pathBreadcrumbs];
  const isValidPath = isLinkValid(currentPath, allPaths);

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
