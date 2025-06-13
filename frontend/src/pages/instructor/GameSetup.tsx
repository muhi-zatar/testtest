import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CogIcon,
  PlusIcon,
  TrashIcon,
  FireIcon,
  ChartBarIcon, 
  UserGroupIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BuildingOffice2Icon,
  BoltIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import ElectricityMarketAPI from '../../api/client';
import { useGameStore } from '../../store/gameStore';

interface PortfolioTemplate {
  id: string;
  name: string;
  description: string;
  plants: Array<{
    plant_type: string;
    capacity_mw: number;
    name: string;
  }>;
}

interface CustomPlant {
  plant_type: string;
  capacity_mw: number;
  name: string;
  commissioning_year: number;
  retirement_year: number;
}

interface UtilityConfig {
  id: string;
  name: string;
  budget: number;
  debt: number;
  equity: number;
  plants: CustomPlant[];
}

interface GameSetupData {
  sessionName: string;
  startYear: number;
  endYear: number;
  carbonPrice: number;
  numberOfUtilities: number;
  utilityConfigs: UtilityConfig[];
  demandProfile: {
    off_peak_demand: number;
    shoulder_demand: number;
    peak_demand: number;
    demand_growth_rate: number;
  };
  fuelPrices: Record<string, Record<string, number>>;
}

const GameSetup: React.FC = () => {
  // ... rest of the component code remains unchanged ...
};

export default GameSetup;