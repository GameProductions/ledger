// @ts-nocheck
/** @jsxImportSource react */



import React, { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

/**
 * GameProductions Foundation Onboarding Tour (v1.3.0)
 * Standardized tour engine using 'driver.js'.
 * Supports custom steps and state-tracked play (localStorage check).
 */
export const OnboardingTour = (props: any) => {
  const { steps = [], tourKey = 'default' } = props;
  useEffect(() => {
    const hasCompletedTour = localStorage.getItem(`gp_tour_complete_${tourKey}`);

    if (!hasCompletedTour) {
      const driverObj = driver({
        showProgress: true,
        steps: steps,
        onDestroyed: () => {
          localStorage.setItem(`gp_tour_complete_${tourKey}`, 'true');
        },
      });

      driverObj.drive();
    }
  }, [steps, tourKey]);

  return null; // Side-effect only component
};
