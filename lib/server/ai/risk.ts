export interface ShipmentRiskContext {
  poNumber: string;
  expectedDelivery: Date;
  currentMilestone: string;
  lastVerifiedEventDate?: Date;
  supplierHistoricalOnTimeRate: number; // e.g. 95%
  supplierAverageDelayDays: number;     // e.g. 1.2 days
  events: { title: string; timestamp: Date; isVerified: boolean }[];
}

export interface RiskAssessmentResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedDelayDays: number;
  expectedDeliveryRevised: Date;
  riskReasons: string[];
  explanation: string;
}

/**
 * Deterministic + AI Explainable Shipment Risk & Delay Prediction Engine
 */
export function evaluateShipmentRisk(context: ShipmentRiskContext): RiskAssessmentResult {
  const reasons: string[] = [];
  let delayDays = 0;
  let severityScore = 0; // 0 (low) to 100 (critical)

  const now = new Date();

  // 1. Check milestone progression vs timeline
  const daysUntilExpected = (context.expectedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (context.currentMilestone === 'WAREHOUSE') {
    if (daysUntilExpected <= 2) {
      // Still in warehouse with 2 days or fewer left
      delayDays += 1.5;
      severityScore += 45;
      reasons.push('Warehouse dispatch milestone delayed beyond normal threshold.');
    }
  } else if (context.currentMilestone === 'PREPARED') {
    if (daysUntilExpected <= 3) {
      delayDays += 2.0;
      severityScore += 60;
      reasons.push('Supplier has prepared goods but carrier pickup has not been verified.');
    }
  }

  // 2. Evaluate historical supplier latency
  if (context.supplierHistoricalOnTimeRate < 92) {
    delayDays += context.supplierAverageDelayDays || 1.2;
    severityScore += 25;
    reasons.push(`Supplier historical on-time rate is ${context.supplierHistoricalOnTimeRate}%, averaging ${context.supplierAverageDelayDays || 1.2} days delay.`);
  }

  // 3. Verification staleness
  if (context.lastVerifiedEventDate) {
    const hoursSinceLastEvent = (now.getTime() - context.lastVerifiedEventDate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastEvent > 48 && context.currentMilestone !== 'DELIVERED') {
      severityScore += 20;
      reasons.push('No fresh carrier event confirmed in over 48 hours.');
    }
  }

  // Determine categorical risk
  let riskLevel: RiskAssessmentResult['riskLevel'] = 'LOW';
  if (severityScore >= 70 || delayDays >= 2.0) {
    riskLevel = 'HIGH';
  } else if (severityScore >= 35 || delayDays >= 1.0) {
    riskLevel = 'MEDIUM';
  }

  const revisedDelivery = new Date(context.expectedDelivery.getTime() + delayDays * 24 * 60 * 60 * 1000);

  const explanation = reasons.length > 0
    ? `Delivery likely delayed by ~${delayDays.toFixed(1)} days due to: ${reasons.join(' ')}`
    : 'Shipment is tracking normally against scheduled milestones.';

  return {
    riskLevel,
    estimatedDelayDays: parseFloat(delayDays.toFixed(1)),
    expectedDeliveryRevised: revisedDelivery,
    riskReasons: reasons.length > 0 ? reasons : ['All logistics milestones verified on schedule.'],
    explanation
  };
}
