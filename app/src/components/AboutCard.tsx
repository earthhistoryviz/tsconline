import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import defaultProPic from "../assets/defaultpropic.jpg";

type AboutCardProps = {
  name: string;
  role: string;
  homeTown: string;
  timeWorked: string;
  proPic: string | undefined;
};
export const AboutCard = ({ name, role, homeTown, timeWorked, proPic = defaultProPic }: AboutCardProps) => {
  return (
    <Card
      sx={{
        minWidth: 330,
        marginLeft: ".5vw",
        marginRight: ".5vw",
        marginTop: ".5vw",
        marginBottom: ".5vw"
      }}>
      <CardMedia sx={{ height: 250 }} image={proPic} title={name} />
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          {name}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {role}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {homeTown}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {timeWorked}
        </Typography>
      </CardContent>
    </Card>
  );
};
