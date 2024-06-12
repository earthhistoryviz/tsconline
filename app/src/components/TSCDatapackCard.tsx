import { Card, CardContent, CardMedia, IconButton, Typography } from "@mui/material";
import { DatapackParsingPack } from "@tsconline/shared";
import { devSafeUrl } from "../util";
import { useState } from "react";
import styles from "./TSCDatapackCard.module.css";

type TSCDatapackCardProps = {
    name: string;
    datapack: DatapackParsingPack;
}
export const TSCDatapackCard: React.FC<TSCDatapackCardProps> = (({ name, datapack }) => {
    const [imageUrl, setImageUrl] = useState(devSafeUrl("/datapack-images/" + datapack.image)); 
    const defaultImageUrl = devSafeUrl("/datapack-images/default.png")
    return (
        <Card className={styles.card}>
            <CardMedia
            component="img"
            height="140"
            image={imageUrl}
            onError={() => setImageUrl(defaultImageUrl)}
            />
            <CardContent>
                <div className={styles.headerContainer}>
                    <Typography className={styles.header}>{name}</Typography>
                    <IconButton className={styles.other}>
                        <span className={styles.more}/>
                    </IconButton>
                </div>
            </CardContent>
        </Card>
    )
})

function imageExists(image_url: string) {
    const img = new Image();
    img.src = image_url;
    return img.complete;
}