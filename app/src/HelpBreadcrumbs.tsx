import { useState, useEffect } from "react";
import { Breadcrumbs, Link, Stack, Typography } from "@mui/material";
import { fetcher } from "./util";
import { PageNotFound } from "./PageNotFound";
import { useLocation, useNavigate } from "react-router";
import { useTheme } from "@mui/material/styles";
import { generatePath } from "./state/non-action-util";
import { MarkdownFile, MarkdownTree, assertMarkdownTree, isMarkdownFile } from "@tsconline/shared";


type Breadcrumb = {
  to: string;
  title: string;
}
type BreadCrumbsWrapperProps = {
  markdownTree: MarkdownTree;
}

export const BreadcrumbsWrapper: React.FC<BreadCrumbsWrapperProps> =  ({
  markdownTree
}) =>  {
  const theme = useTheme();

  const currentPath = useLocation().pathname;
  const navigate = useNavigate();
  const keys = currentPath.split("/help/")[1].split("/");
  let markdownTreePointer: MarkdownTree | MarkdownFile = markdownTree;
  let fullPath = "";
  const pathBreadcrumbs: Breadcrumb[] = [];
  for (const [index, key] of keys.entries()) {
    if (!markdownTree[key]) {
      // not valid
      break;
    }
    // cast because we know it can't be MarkdownFile
    fullPath += `/${key}`;
    markdownTreePointer = (markdownTreePointer as MarkdownTree)[key];
    if (isMarkdownFile(markdownTreePointer)) {
      pathBreadcrumbs.push({
        to: fullPath += `/${markdownTreePointer.pathname}`,
        title: markdownTreePointer.title
      });
    }
  }


  const breadcrumbs: Breadcrumb[] = [{ to: "", title: "All Categories" }, ...pathBreadcrumbs];


  const handleBreadcrumbClick = (breadcrumbPath: string, event: React.MouseEvent) => {
    event.preventDefault();
    navigate(`/help${breadcrumbPath}`);
  };

  if (Object.keys(markdownTree).length === 0) {
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
              {breadcrumb.title}
            </Link>
          ))}
        </Breadcrumbs>
      </Stack>

      {breadcrumbs.length > 0 && (
        <div>
          <Typography variant="h4">{breadcrumbs[breadcrumbs.length - 1].title}</Typography>
        </div>
      )}
    </Stack>
  );
}
