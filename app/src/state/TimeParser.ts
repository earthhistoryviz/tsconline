import React, { useState, useEffect } from 'react';
import { fetcher } from '../util'
import { TimescaleItem } from '@tsconline/shared';
import { action } from "mobx";

export const fetchTimescaleData = async () => {
  try {
    const response = await fetcher('/timescale', {
      method: "GET"
    });

    if (response.ok) {
      const data = await response.json();
      const stages: TimescaleItem[] = data.stages || [];
      const GeologicalBaseStageAges: TimescaleItem[] = [...stages]; // Array for base
      const GeologicalTopStageAges: TimescaleItem[] = []; // Array for top

      for (let i = 0; i < stages.length; i++) {
        const item = stages[i];
        const value = i > 0 ? stages[i - 1].value : 0;
        GeologicalTopStageAges.push({ ...item, value });
      }

      return { GeologicalTopStageAges, GeologicalBaseStageAges, loading: false };
    } else {
      console.error('Server responds with:', response.status);
      return {GeologicalBaseStageAges: [], GeologicalTopStageAges: [], loading: false};
    }
  } catch (error) {
    console.error('Error fetching timescale data:', error);
    return { GeologicalBaseStageAges: [], GeologicalTopStageAges: [], loading: false };
  }
};

export default fetchTimescaleData;
  
