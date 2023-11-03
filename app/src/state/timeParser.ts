import React, { useState, useEffect } from 'react';


const geologicalStages = ["Gelasian (1.8 Ma top)", "Piacenzian (2.58 Ma top)", "Zanclean (3.6 Ma top)", "Messinian (5.335 Ma top)", "Tortonian (7.25 Ma top)", "Serravallian (11.63 Ma top)", "Langhian (13.82 Ma top)", "Burdigalian (15.99 Ma top)"];

function processStageNames() {
    const [data, setData] = useState([]);
    const [stages, setStages] = useState([]); // Assuming hard coded stage names

    useEffect(() => {
        fetch('/timescale') //get data from server
            .then((response) => response.json())
            .then((jsonData) => {
                const filteredData = jsonData.filter(item => geologicalStages.includes(item.stage));
                setData(jsonData); // store the data
                setFilteredData(filteredData); //store the filtered the data
            })
            .catch((error) => {
                console.error('Error fetching data:', error);
            })
    })
    


}