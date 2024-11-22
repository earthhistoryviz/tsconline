import { observer } from "mobx-react-lite";
import React, { useContext, useEffect, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Card, CardContent, CardMedia, Grid, Typography } from "@mui/material";
import { toJS } from "mobx";
import TSCreatorLogo from './assets/TSCreatorLogo.png';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { context } from "./state";
import { TSCIcon, TSCButton, TSCCard, StyledScrollbar } from "./components";
import WorkshopDetails from "./WorkshopDetails";
import "./Workshops.css";
import { useTheme } from "@mui/material/styles";

type Workshop = {
    title: string;
    start: string;
    end: string;
    workshopId: number;
    active: boolean;
    datapacks: string[];
};

const dummyWorkshops: Workshop[] = [
    // Active Workshops
    {
        title: 'React Basics',
        start: '2024-11-20',
        end: '2024-11-25',
        workshopId: 1,
        active: true,
        datapacks: ['React Overview', 'JSX Basics'],
    },
    {
        title: 'Advanced TypeScript',
        start: '2024-11-18',
        end: '2024-11-24',
        workshopId: 2,
        active: true,
        datapacks: ['Generics', 'Decorators', 'Type Inference'],
    },
    // Upcoming Workshops
    {
        title: 'Node.js for Beginners',
        start: '2024-12-01',
        end: '2024-12-10',
        workshopId: 3,
        active: false,
        datapacks: ['Node Basics', 'Express.js Overview'],
    },
    {
        title: 'Fullstack Development',
        start: '2024-12-05',
        end: '2024-12-15',
        workshopId: 4,
        active: false,
        datapacks: ['Frontend-Backend Integration', 'API Design'],
    },
    // Expired Workshops
    {
        title: 'CSS in Depth',
        start: '2024-11-01',
        end: '2024-11-10',
        workshopId: 5,
        active: false,
        datapacks: ['Flexbox', 'Grid Layout', 'Animations'],
    },
    {
        title: 'Python for Data Science',
        start: '2024-10-15',
        end: '2024-10-25',
        workshopId: 6,
        active: false,
        datapacks: ['Pandas', 'NumPy', 'Matplotlib'],
    },
];

export const Workshops: React.FC = observer(() => {
    const { state, actions } = useContext(context);
    const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
    const theme = useTheme();
    const now = new Date();

    // 分类 Workshops
    const activeWorkshops = dummyWorkshops.filter(
        (workshop) => workshop.active && new Date(workshop.start) <= now && new Date(workshop.end) >= now
    );
    const upcomingWorkshops = dummyWorkshops.filter(
        (workshop) => !workshop.active && new Date(workshop.start) > now
    );
    const expiredWorkshops = dummyWorkshops.filter(
        (workshop) => new Date(workshop.end) < now
    );

    const renderWorkshopsCategory = (workshops: Workshop[], noDataMessage: string) => (
        <StyledScrollbar>
            <Grid
                container
                spacing={2}
                sx={{
                    display: "flex",
                    overflowX: "auto",
                    padding: "16px 16px", // Add padding for better spacing
                    bgcolor: "secondaryBackground.main"
                }}
            >
                {workshops.length > 0 ? (
                    workshops.map((workshop) => (
                        <Grid item key={workshop.workshopId}>
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
                                    overflow: "hidden", // Prevents any content overflow

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
                    <Typography style={{ marginTop: 16 }}>{noDataMessage}</Typography>
                )}
            </Grid>
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
                    <Typography className="h">
                        Your Registered Workshops
                    </Typography>
                    <Typography className="dh">
                        Click a workshop to see more information!
                    </Typography>

                    {/* Active Workshops */}
                    <Accordion sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: "secondaryBackground.main" }}>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls="active-workshops-content"
                            className="workshops-summary"
                        >
                            <Typography>Active Workshops</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {renderWorkshopsCategory(activeWorkshops, "No active workshops at the moment.")}
                        </AccordionDetails>
                    </Accordion>

                    {/* Upcoming Workshops */}
                    <Accordion sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: "secondaryBackground.main" }}>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls="upcoming-workshops-content"
                            className="workshops-summary"
                        >
                            <Typography>Upcoming Workshops</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {renderWorkshopsCategory(upcomingWorkshops, "No upcoming workshops at the moment.")}
                        </AccordionDetails>
                    </Accordion>

                    {/* Expired Workshops */}
                    <Accordion sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: "secondaryBackground.main" }} >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls="expired-workshops-content"
                            className="workshops-summary"
                        >
                            <Typography>Expired Workshops</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {renderWorkshopsCategory(expiredWorkshops, "No expired workshops at the moment.")}
                        </AccordionDetails>
                    </Accordion>
                </Box >
            ) : (
                <Typography
                    style={{ fontSize: 24, textAlign: "center", marginTop: "20%" }}
                >
                    You are not logged in. Please sign in to view your workshops.
                </Typography>
            )}
        </>
    );
});