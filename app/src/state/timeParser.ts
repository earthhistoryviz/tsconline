import React, { useState, useEffect } from 'react';
import { fetcher } from '../util'

export const fetchTimescaleData = async () => {
  try {
    const response = await fetcher('/timescale', {
      method: "GET"
    });
    console.log(response);
    if (response.ok) {
      const data = await response.json();
      console.log(data);
      return data;
    }
    else {
      console.error('Server responds with:', response.status);
      return [];
    }
  } catch (error) {
    console.error('Error fetching timescale data:', error);
    return [];
  }
  
};

export default fetchTimescaleData;
  
