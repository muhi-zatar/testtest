/**
 * Utility Calculation Tests
 * Tests financial calculations and market analysis functions
 */

import { describe, it, expect } from 'vitest';

// Utility functions for testing
export const calculateMarginalCost = (
  variableOM: number,
  heatRate?: number,
  fuelPrice?: number,
  emissionsRate?: number,
  carbonPrice?: number
): number => {
  let cost = variableOM;
  
  // Add fuel cost
  if (heatRate && fuelPrice) {
    cost += (heatRate * fuelPrice) / 1000; // Convert BTU to MMBtu
  }
  
  // Add carbon cost
  if (emissionsRate && carbonPrice) {
    cost += emissionsRate * carbonPrice;
  }
  
  return cost;
};

export const calculateROI = (
  annualCashFlow: number,
  initialInvestment: number,
  economicLife: number
): { roi: number; paybackPeriod: number; npv: number } => {
  const discountRate = 0.08; // 8% discount rate
  
  // Calculate NPV
  let npv = -initialInvestment;
  for (let year = 1; year <= economicLife; year++) {
    npv += annualCashFlow / Math.pow(1 + discountRate, year);
  }
  
  // Calculate simple ROI
  const totalCashFlow = annualCashFlow * economicLife;
  const roi = (totalCashFlow - initialInvestment) / initialInvestment;
  
  // Calculate payback period
  const paybackPeriod = initialInvestment / annualCashFlow;
  
  return { roi, paybackPeriod, npv };
};

export const calculateCapacityFactor = (
  actualGeneration: number,
  maxPossibleGeneration: number
): number => {
  if (maxPossibleGeneration === 0) return 0;
  return Math.min(1, actualGeneration / maxPossibleGeneration);
};

export const calculateDebtToEquityRatio = (debt: number, equity: number): number => {
  if (equity === 0) return Infinity;
  return debt / equity;
};

export const getCreditRating = (debtToEquityRatio: number): string => {
  if (debtToEquityRatio < 1.0) return 'AAA';
  if (debtToEquityRatio < 1.5) return 'AA';
  if (debtToEquityRatio < 2.0) return 'A';
  return 'BBB';
};

export const calculatePortfolioDiversity = (plants: Array<{ plant_type: string; capacity_mw: number }>): number => {
  if (plants.length === 0) return 0;
  
  const totalCapacity = plants.reduce((sum, plant) => sum + plant.capacity_mw, 0);
  if (totalCapacity === 0) return 0;
  
  // Calculate Herfindahl-Hirschman Index for technology concentration
  const typeShares: Record<string, number> = {};
  plants.forEach(plant => {
    typeShares[plant.plant_type] = (typeShares[plant.plant_type] || 0) + plant.capacity_mw;
  });
  
  let hhi = 0;
  Object.values(typeShares).forEach(capacity => {
    const share = capacity / totalCapacity;
    hhi += share * share;
  });
  
  // Convert to diversity index (1 - HHI)
  return 1 - hhi;
};

describe('Financial Calculations', () => {
  describe('Marginal Cost Calculation', () => {
    it('should calculate marginal cost for renewable plant', () => {
      const cost = calculateMarginalCost(0, undefined, undefined, 0, 50);
      expect(cost).toBe(0);
    });

    it('should calculate marginal cost for coal plant', () => {
      const variableOM = 4.5;
      const heatRate = 8800;
      const fuelPrice = 2.50;
      const emissionsRate = 0.95;
      const carbonPrice = 50;
      
      const cost = calculateMarginalCost(variableOM, heatRate, fuelPrice, emissionsRate, carbonPrice);
      
      const expectedFuelCost = (8800 * 2.50) / 1000; // 22.0
      const expectedCarbonCost = 0.95 * 50; // 47.5
      const expectedTotal = 4.5 + 22.0 + 47.5; // 74.0
      
      expect(cost).toBeCloseTo(expectedTotal, 2);
    });

    it('should calculate marginal cost for natural gas plant', () => {
      const variableOM = 3.0;
      const heatRate = 6400;
      const fuelPrice = 4.00;
      const emissionsRate = 0.35;
      const carbonPrice = 50;
      
      const cost = calculateMarginalCost(variableOM, heatRate, fuelPrice, emissionsRate, carbonPrice);
      
      const expectedFuelCost = (6400 * 4.00) / 1000; // 25.6
      const expectedCarbonCost = 0.35 * 50; // 17.5
      const expectedTotal = 3.0 + 25.6 + 17.5; // 46.1
      
      expect(cost).toBeCloseTo(expectedTotal, 2);
    });

    it('should handle missing fuel data', () => {
      const cost = calculateMarginalCost(5.0, 8000, undefined, 0.8, 40);
      expect(cost).toBe(5.0 + 0.8 * 40); // Only variable O&M + carbon cost
    });
  });

  describe('ROI Calculation', () => {
    it('should calculate ROI for profitable investment', () => {
      const annualCashFlow = 50000000; // $50M/year
      const initialInvestment = 500000000; // $500M
      const economicLife = 25; // 25 years
      
      const result = calculateROI(annualCashFlow, initialInvestment, economicLife);
      
      expect(result.roi).toBeGreaterThan(1); // Should be profitable
      expect(result.paybackPeriod).toBe(10); // 500M / 50M = 10 years
      expect(result.npv).toBeGreaterThan(0); // Should have positive NPV
    });

    it('should calculate ROI for unprofitable investment', () => {
      const annualCashFlow = 10000000; // $10M/year
      const initialInvestment = 500000000; // $500M
      const economicLife = 25; // 25 years
      
      const result = calculateROI(annualCashFlow, initialInvestment, economicLife);
      
      expect(result.roi).toBeLessThan(0); // Should be unprofitable
      expect(result.paybackPeriod).toBe(50); // 500M / 10M = 50 years
      expect(result.npv).toBeLessThan(0); // Should have negative NPV
    });

    it('should handle zero cash flow', () => {
      const result = calculateROI(0, 1000000, 20);
      
      expect(result.roi).toBe(-1); // -100% return
      expect(result.paybackPeriod).toBe(Infinity);
      expect(result.npv).toBe(-1000000); // Just the initial investment loss
    });
  });

  describe('Capacity Factor Calculation', () => {
    it('should calculate capacity factor correctly', () => {
      const actualGeneration = 2365200; // MWh/year
      const maxPossibleGeneration = 8760000; // 1000 MW * 8760 hours
      
      const cf = calculateCapacityFactor(actualGeneration, maxPossibleGeneration);
      expect(cf).toBeCloseTo(0.27, 2); // 27% capacity factor
    });

    it('should cap capacity factor at 100%', () => {
      const actualGeneration = 10000000; // More than possible
      const maxPossibleGeneration = 8760000;
      
      const cf = calculateCapacityFactor(actualGeneration, maxPossibleGeneration);
      expect(cf).toBe(1.0); // Capped at 100%
    });

    it('should handle zero maximum generation', () => {
      const cf = calculateCapacityFactor(1000, 0);
      expect(cf).toBe(0);
    });
  });

  describe('Financial Health Metrics', () => {
    it('should calculate debt-to-equity ratio', () => {
      const debt = 1000000000; // $1B
      const equity = 2000000000; // $2B
      
      const ratio = calculateDebtToEquityRatio(debt, equity);
      expect(ratio).toBe(0.5);
    });

    it('should handle zero equity', () => {
      const ratio = calculateDebtToEquityRatio(1000000000, 0);
      expect(ratio).toBe(Infinity);
    });

    it('should determine credit rating from D/E ratio', () => {
      expect(getCreditRating(0.5)).toBe('AAA');
      expect(getCreditRating(1.2)).toBe('AA');
      expect(getCreditRating(1.8)).toBe('A');
      expect(getCreditRating(2.5)).toBe('BBB');
    });
  });

  describe('Portfolio Analysis', () => {
    it('should calculate portfolio diversity', () => {
      const plants = [
        { plant_type: 'solar', capacity_mw: 300 },
        { plant_type: 'wind_onshore', capacity_mw: 200 },
        { plant_type: 'natural_gas_cc', capacity_mw: 400 },
        { plant_type: 'coal', capacity_mw: 100 }
      ];
      
      const diversity = calculatePortfolioDiversity(plants);
      expect(diversity).toBeGreaterThan(0.5); // Should be reasonably diverse
      expect(diversity).toBeLessThan(1.0); // Can't be perfectly diverse
    });

    it('should return zero diversity for single plant type', () => {
      const plants = [
        { plant_type: 'solar', capacity_mw: 300 },
        { plant_type: 'solar', capacity_mw: 200 }
      ];
      
      const diversity = calculatePortfolioDiversity(plants);
      expect(diversity).toBe(0); // No diversity
    });

    it('should handle empty portfolio', () => {
      const diversity = calculatePortfolioDiversity([]);
      expect(diversity).toBe(0);
    });

    it('should handle zero capacity plants', () => {
      const plants = [
        { plant_type: 'solar', capacity_mw: 0 },
        { plant_type: 'wind_onshore', capacity_mw: 0 }
      ];
      
      const diversity = calculatePortfolioDiversity(plants);
      expect(diversity).toBe(0);
    });
  });
});

describe('Market Analysis Functions', () => {
  describe('Price Analysis', () => {
    it('should calculate price volatility', () => {
      const prices = [45, 52, 48, 61, 55, 67];
      const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
      const volatility = Math.sqrt(variance) / mean;
      
      expect(volatility).toBeGreaterThan(0);
      expect(volatility).toBeLessThan(1);
    });

    it('should identify price trends', () => {
      const increasingPrices = [40, 45, 50, 55, 60];
      const decreasingPrices = [60, 55, 50, 45, 40];
      
      const calculateTrend = (prices: number[]) => {
        if (prices.length < 2) return 'stable';
        const first = prices[0];
        const last = prices[prices.length - 1];
        const change = (last - first) / first;
        
        if (change > 0.1) return 'increasing';
        if (change < -0.1) return 'decreasing';
        return 'stable';
      };
      
      expect(calculateTrend(increasingPrices)).toBe('increasing');
      expect(calculateTrend(decreasingPrices)).toBe('decreasing');
      expect(calculateTrend([50, 51, 49, 52])).toBe('stable');
    });
  });

  describe('Load Period Analysis', () => {
    it('should calculate period-specific metrics', () => {
      const loadPeriods = {
        off_peak: { hours: 5000, demand: 1200 },
        shoulder: { hours: 2500, demand: 1800 },
        peak: { hours: 1260, demand: 2400 }
      };
      
      const totalHours = Object.values(loadPeriods).reduce((sum, period) => sum + period.hours, 0);
      expect(totalHours).toBe(8760); // Should equal hours in a year
      
      const weightedAverageDemand = Object.values(loadPeriods).reduce(
        (sum, period) => sum + (period.demand * period.hours), 0
      ) / totalHours;
      
      expect(weightedAverageDemand).toBeGreaterThan(1200);
      expect(weightedAverageDemand).toBeLessThan(2400);
    });

    it('should calculate annual energy from period data', () => {
      const plantCapacity = 400; // MW
      const capacityFactors = {
        off_peak: 0.85,
        shoulder: 0.80,
        peak: 0.90
      };
      
      const annualEnergy = 
        (plantCapacity * capacityFactors.off_peak * 5000) +
        (plantCapacity * capacityFactors.shoulder * 2500) +
        (plantCapacity * capacityFactors.peak * 1260);
      
      expect(annualEnergy).toBeGreaterThan(0);
      expect(annualEnergy).toBeLessThan(plantCapacity * 8760); // Can't exceed theoretical max
    });
  });

  describe('Investment Analysis', () => {
    it('should calculate financing structure', () => {
      const totalCapex = 1000000000; // $1B
      const debtPercentage = 0.70; // 70% debt
      const equityPercentage = 0.30; // 30% equity
      
      const debtFinancing = totalCapex * debtPercentage;
      const equityFinancing = totalCapex * equityPercentage;
      
      expect(debtFinancing).toBe(700000000);
      expect(equityFinancing).toBe(300000000);
      expect(debtFinancing + equityFinancing).toBe(totalCapex);
    });

    it('should calculate annual debt service', () => {
      const principal = 700000000; // $700M debt
      const interestRate = 0.045; // 4.5%
      const termYears = 20;
      
      // Calculate annual payment using PMT formula
      const monthlyRate = interestRate / 12;
      const numPayments = termYears * 12;
      const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                            (Math.pow(1 + monthlyRate, numPayments) - 1);
      const annualDebtService = monthlyPayment * 12;
      
      expect(annualDebtService).toBeGreaterThan(0);
      expect(annualDebtService).toBeLessThan(principal); // Should be less than principal
    });

    it('should evaluate investment viability', () => {
      const evaluateInvestment = (
        annualRevenue: number,
        annualCosts: number,
        initialInvestment: number,
        economicLife: number
      ) => {
        const annualCashFlow = annualRevenue - annualCosts;
        const { roi, paybackPeriod, npv } = calculateROI(annualCashFlow, initialInvestment, economicLife);
        
        return {
          viable: npv > 0 && paybackPeriod < economicLife * 0.6, // Payback within 60% of life
          roi,
          paybackPeriod,
          npv
        };
      };
      
      // Good investment
      const goodInvestment = evaluateInvestment(100000000, 60000000, 500000000, 25);
      expect(goodInvestment.viable).toBe(true);
      expect(goodInvestment.roi).toBeGreaterThan(0);
      
      // Bad investment
      const badInvestment = evaluateInvestment(30000000, 60000000, 500000000, 25);
      expect(badInvestment.viable).toBe(false);
      expect(badInvestment.roi).toBeLessThan(0);
    });
  });

  describe('Market Metrics', () => {
    it('should calculate market share', () => {
      const utilityGeneration = 1500000; // MWh
      const totalMarketGeneration = 10000000; // MWh
      
      const marketShare = utilityGeneration / totalMarketGeneration;
      expect(marketShare).toBe(0.15); // 15%
    });

    it('should calculate revenue per MW', () => {
      const totalRevenue = 150000000; // $150M
      const totalCapacity = 1200; // MW
      
      const revenuePerMW = totalRevenue / totalCapacity;
      expect(revenuePerMW).toBe(125000); // $125k per MW
    });

    it('should calculate capacity utilization', () => {
      const plants = [
        { capacity_mw: 400, capacity_factor: 0.85 },
        { capacity_mw: 300, capacity_factor: 0.27 },
        { capacity_mw: 200, capacity_factor: 0.35 }
      ];
      
      const totalCapacity = plants.reduce((sum, plant) => sum + plant.capacity_mw, 0);
      const weightedCapacityFactor = plants.reduce(
        (sum, plant) => sum + (plant.capacity_factor * plant.capacity_mw), 0
      ) / totalCapacity;
      
      expect(weightedCapacityFactor).toBeGreaterThan(0);
      expect(weightedCapacityFactor).toBeLessThan(1);
    });
  });

  describe('Risk Metrics', () => {
    it('should calculate fuel price risk', () => {
      const fuelExposure = {
        coal: 0.3,      // 30% of generation from coal
        natural_gas: 0.5, // 50% from gas
        nuclear: 0.2    // 20% from nuclear
      };
      
      const fuelPriceVolatility = {
        coal: 0.15,     // 15% volatility
        natural_gas: 0.25, // 25% volatility
        nuclear: 0.05   // 5% volatility
      };
      
      const portfolioFuelRisk = Object.entries(fuelExposure).reduce(
        (risk, [fuel, exposure]) => risk + (exposure * (fuelPriceVolatility[fuel as keyof typeof fuelPriceVolatility] || 0)), 0
      );
      
      expect(portfolioFuelRisk).toBeGreaterThan(0);
      expect(portfolioFuelRisk).toBeLessThan(0.25); // Should be less than max individual volatility
    });

    it('should calculate technology concentration risk', () => {
      const highConcentrationPortfolio = [
        { plant_type: 'coal', capacity_mw: 800 },
        { plant_type: 'coal', capacity_mw: 200 }
      ];
      
      const diversifiedPortfolio = [
        { plant_type: 'coal', capacity_mw: 250 },
        { plant_type: 'natural_gas_cc', capacity_mw: 250 },
        { plant_type: 'solar', capacity_mw: 250 },
        { plant_type: 'wind_onshore', capacity_mw: 250 }
      ];
      
      const highConcentrationDiversity = calculatePortfolioDiversity(highConcentrationPortfolio);
      const diversifiedDiversity = calculatePortfolioDiversity(diversifiedPortfolio);
      
      expect(diversifiedDiversity).toBeGreaterThan(highConcentrationDiversity);
    });
  });
});

describe('Game Logic Functions', () => {
  describe('Merit Order Dispatch', () => {
    it('should sort bids by price for merit order', () => {
      const bids = [
        { id: 'bid_1', price: 60, quantity: 200, plant_type: 'coal' },
        { id: 'bid_2', price: 45, quantity: 300, plant_type: 'nuclear' },
        { id: 'bid_3', price: 75, quantity: 150, plant_type: 'natural_gas_ct' },
        { id: 'bid_4', price: 25, quantity: 250, plant_type: 'solar' }
      ];
      
      const sortedBids = [...bids].sort((a, b) => a.price - b.price);
      
      expect(sortedBids[0].plant_type).toBe('solar'); // Cheapest first
      expect(sortedBids[1].plant_type).toBe('nuclear');
      expect(sortedBids[2].plant_type).toBe('coal');
      expect(sortedBids[3].plant_type).toBe('natural_gas_ct'); // Most expensive last
    });

    it('should clear market at marginal price', () => {
      const demand = 600; // MW
      const bids = [
        { price: 25, quantity: 250 }, // Solar
        { price: 45, quantity: 300 }, // Nuclear  
        { price: 60, quantity: 200 }, // Coal
        { price: 75, quantity: 150 }  // Gas CT
      ];
      
      let cumulativeSupply = 0;
      let clearingPrice = 0;
      let acceptedBids = 0;
      
      for (const bid of bids.sort((a, b) => a.price - b.price)) {
        cumulativeSupply += bid.quantity;
        acceptedBids++;
        
        if (cumulativeSupply >= demand) {
          clearingPrice = bid.price;
          break;
        }
      }
      
      expect(clearingPrice).toBe(60); // Coal plant sets the price
      expect(acceptedBids).toBe(3); // Solar, nuclear, and coal accepted
      expect(cumulativeSupply).toBeGreaterThanOrEqual(demand);
    });
  });

  describe('Time Progression', () => {
    it('should advance years correctly', () => {
      const gameSession = {
        current_year: 2025,
        start_year: 2025,
        end_year: 2035
      };
      
      const advanceYear = (session: typeof gameSession) => {
        if (session.current_year < session.end_year) {
          return { ...session, current_year: session.current_year + 1 };
        }
        return session;
      };
      
      const nextYear = advanceYear(gameSession);
      expect(nextYear.current_year).toBe(2026);
      
      // Test end condition
      const finalYear = { ...gameSession, current_year: 2035 };
      const shouldNotAdvance = advanceYear(finalYear);
      expect(shouldNotAdvance.current_year).toBe(2035);
    });

    it('should calculate simulation progress', () => {
      const calculateProgress = (currentYear: number, startYear: number, endYear: number) => {
        return ((currentYear - startYear) / (endYear - startYear)) * 100;
      };
      
      expect(calculateProgress(2025, 2025, 2035)).toBe(0); // Start
      expect(calculateProgress(2030, 2025, 2035)).toBe(50); // Midpoint
      expect(calculateProgress(2035, 2025, 2035)).toBe(100); // End
    });
  });

  describe('Plant Lifecycle', () => {
    it('should determine plant status based on years', () => {
      const determineStatus = (
        currentYear: number,
        constructionStart: number,
        commissioning: number,
        retirement: number
      ) => {
        if (currentYear < constructionStart) return 'planned';
        if (currentYear < commissioning) return 'under_construction';
        if (currentYear >= retirement) return 'retired';
        return 'operating';
      };
      
      expect(determineStatus(2024, 2025, 2027, 2052)).toBe('planned');
      expect(determineStatus(2026, 2025, 2027, 2052)).toBe('under_construction');
      expect(determineStatus(2030, 2025, 2027, 2052)).toBe('operating');
      expect(determineStatus(2053, 2025, 2027, 2052)).toBe('retired');
    });

    it('should calculate remaining plant life', () => {
      const calculateRemainingLife = (currentYear: number, retirementYear: number) => {
        return Math.max(0, retirementYear - currentYear);
      };
      
      expect(calculateRemainingLife(2025, 2050)).toBe(25);
      expect(calculateRemainingLife(2050, 2050)).toBe(0);
      expect(calculateRemainingLife(2055, 2050)).toBe(0);
    });
  });
});