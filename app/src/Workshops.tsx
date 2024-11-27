import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Typography
} from "@mui/material";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { context } from "./state";
import { StyledScrollbar } from "./components";
import WorkshopDetails from "./WorkshopDetails";
import "./Workshops.css";
import { useTheme } from "@mui/material/styles";

// TODO: change this when backend is finished
type Workshop = {
  title: string;
  start: string;
  end: string;
  workshopId: number;
  active: boolean;
  datapacks: string[];
  description: string;
  files: string[];
  downloadLink: string;
};

// TODO: change this when backend is finished
const dummyWorkshops: Workshop[] = [
  // Active Workshops
  {
    title: "React Basics",
    start: "2024-11-20",
    end: "2024-11-25",
    workshopId: 1,
    active: true,
    datapacks: ["React Overview", "JSX Basics"],
    description:
      "This workshop introduces React concepts such as components, props, and state. Perfect for beginners looking to learn the basics of React.",
    files: ["ReactBasics.pdf", "example_code.mdpk"],
    downloadLink: "https://example.com/download/react_basics.zip"
  },
  {
    title: "Advanced TypeScript",
    start: "2024-11-18",
    end: "2024-11-24",
    workshopId: 2,
    active: true,
    datapacks: ["Generics", "Decorators", "Type Inference"],
    description:
      "Dive deep into advanced TypeScript concepts like generics, decorators, and type inference. Ideal for developers with basic TypeScript knowledge.",
    files: ["AdvancedTypeScriptGuide.pdf", "examples.txt"],
    downloadLink: "https://example.com/download/advanced_typescript.zip"
  },
  // Upcoming Workshops
  {
    title: "Node.js for Beginners",
    start: "2024-12-01",
    end: "2024-12-10",
    workshopId: 3,
    active: false,
    datapacks: ["Node Basics", "Express.js Overview"],
    description:
      "Learn the fundamentals of Node.js, including setting up a server and building simple RESTful APIs using Express.js.",
    files: ["NodeIntro.pdf", "starter_code.mdpk"],
    downloadLink: "https://example.com/download/node_js_beginners.zip"
  },
  {
    title: "Fullstack Development",
    start: "2024-12-05",
    end: "2024-12-15",
    workshopId: 4,
    active: false,
    datapacks: ["Frontend-Backend Integration", "API Design"],
    description:
      "A comprehensive workshop on integrating frontend and backend technologies to build fullstack applications, including best practices for API design.",
    files: ["FullstackDevelopment.pdf", "sample_project.txt"],
    downloadLink: "https://example.com/download/fullstack_development.zip"
  },
  // Expired Workshops
  {
    title: "CSS in Depth",
    start: "2024-11-01",
    end: "2024-11-10",
    workshopId: 5,
    active: false,
    datapacks: ["Flexbox", "Grid Layout", "Animations"],
    description:
      "Master advanced CSS techniques, including Flexbox, Grid, and creating smooth animations for modern web designs.",
    files: ["CSSInDepth.pdf", "examples.mpdk"],
    downloadLink: "https://example.com/download/css_in_depth.zip"
  },
  {
    title: "Python for Data Science",
    start: "2024-10-15",
    end: "2024-10-25",
    workshopId: 6,
    active: false,
    datapacks: ["Pandas", "NumPy", "Matplotlib"],
    description:
      "An introductory workshop on data analysis and visualization using Python libraries like Pandas, NumPy, and Matplotlib.",
    files: ["PythonDataScience.pdf", "datasets.txt"],
    downloadLink: "https://example.com/download/python_data_science.zip"
  }
];

export const Workshops: React.FC = observer(() => {
  const { state } = useContext(context);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const theme = useTheme();
  const now = new Date();

  // 分类 Workshops
  const activeWorkshops = dummyWorkshops.filter(
    (workshop) => workshop.active && new Date(workshop.start) <= now && new Date(workshop.end) >= now
  );
  const upcomingWorkshops = dummyWorkshops.filter((workshop) => !workshop.active && new Date(workshop.start) > now);
  const expiredWorkshops = dummyWorkshops.filter((workshop) => new Date(workshop.end) < now);

  const renderWorkshopsCategory = (workshops: Workshop[], noDataMessage: string) => (
    <StyledScrollbar>
      <Box
        sx={{
          display: "flex",
          padding: "5px 5px"
        }}>
        {workshops.length > 0 ? (
          workshops.map((workshop) => (
            <Grid item key={workshop.workshopId} sx={{ padding: "0px 10px" }}>
              <Card
                sx={{
                  width: 250, // Fixed width for all cards
                  height: 300, // Fixed height to ensure consistent size
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  outline: "1px solid",
                  outlineColor: "divider",
                  bgcolor: "secondaryBackground.main",
                  overflow: "hidden" // Prevents any content overflow
                }}
                onClick={() => setSelectedWorkshop(workshop)} // Set selected workshop on click
              >
                <CardContent>
                  <CardMedia
                    component="img"
                    height="140"
                    image={TSCreatorLogo} // Placeholder image
                    alt={workshop.title}
                    sx={{ objectFit: "cover" }} // Ensure the image fits well
                  />
                  <Typography variant="h5" component="div" gutterBottom>
                    {workshop.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Start Date: {workshop.start}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    End Date: {workshop.end}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Typography
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center"
            }}>
            {noDataMessage}
          </Typography>
        )}
      </Box>
    </StyledScrollbar>
  );

  return (
    <>
      {selectedWorkshop ? (
        // Render the WorkshopDetails component if a workshop is selected
        <WorkshopDetails
          workshop={selectedWorkshop}
          onBack={() => setSelectedWorkshop(null)} // Clear selected workshop to go back
        />
      ) : state.isLoggedIn ? (
        <Box padding={4}>
          <Typography className="h">Your Registered Workshops</Typography>
          <Typography className="dh" sx={{ marginBottom: 1 }}>
            Click a workshop to see more information!
          </Typography>

          {/* Active Workshops */}
          <Accordion
            defaultExpanded
            sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: "secondaryBackground.main" }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="active-workshops-content"
              className="workshops-summary">
              <Typography>Active Workshops</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderWorkshopsCategory(activeWorkshops, "No active workshops at the moment.")}
            </AccordionDetails>
          </Accordion>

          {/* Upcoming Workshops */}
          <Accordion
            defaultExpanded
            sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: "secondaryBackground.main" }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="upcoming-workshops-content"
              className="workshops-summary">
              <Typography>Upcoming Workshops</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderWorkshopsCategory(upcomingWorkshops, "No upcoming workshops at the moment.")}
            </AccordionDetails>
          </Accordion>

          {/* Expired Workshops */}
          <Accordion
            defaultExpanded
            sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: "secondaryBackground.main" }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="expired-workshops-content"
              className="workshops-summary">
              <Typography>Passed Workshops</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderWorkshopsCategory(expiredWorkshops, "No passed workshops at the moment.")}
            </AccordionDetails>
          </Accordion>
        </Box>
      ) : (
        <Typography style={{ fontSize: 24, textAlign: "center", marginTop: "20%" }}>
          You are not logged in. Please sign in to view your workshops.
        </Typography>
      )}
    </>
  );
});
