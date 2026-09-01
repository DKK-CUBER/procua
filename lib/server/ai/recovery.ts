import { RecoveryOptionDTO } from '@/lib/types';

export interface RecoveryEvaluationInput {
  shipmentId: string;
  poNumber: string;
  estimatedDelayDays: number;
  totalOrderAmount: number;
  quantity: number;
}

/**
 * Intelligent Recovery Option Generator
 * Formulates structured cost vs. delay recovery options for buyer approval.
 */
export function generateRecoveryOptions(input: RecoveryEvaluationInput): RecoveryOptionDTO[] {
  const options: RecoveryOptionDTO[] = [
    {
      id: `rec-wait-${input.shipmentId}`,
      optionCode: 'WAIT',
      title: 'Option A: Wait for original shipment',
      description: `Accept current logistics routing without incurring extra expediting fees. Expected arrival with +${input.estimatedDelayDays} days delay.`,
      additionalCost: 0,
      delayAvoidedDays: 0,
      isRecommended: false,
      isApproved: false
    },
    {
      id: `rec-expedite-${input.shipmentId}`,
      optionCode: 'PARTIAL_REPLACEMENT',
      title: 'Option B: Expedite local warehouse buffer (100 units)',
      description: 'Dispatch an immediate buffer batch via priority express courier while remaining bulk units proceed via standard surface freight.',
      additionalCost: 3500,
      delayAvoidedDays: Math.min(2.0, input.estimatedDelayDays),
      isRecommended: true,
      isApproved: false
    },
    {
      id: `rec-alt-${input.shipmentId}`,
      optionCode: 'ALTERNATIVE_SUPPLIER',
      title: 'Option C: Emergency reroute to alternative local vendor',
      description: 'Activate pre-qualified secondary vendor (Ernest Furnishings) for next-day dispatch from nearby warehouse depot.',
      additionalCost: 8000,
      delayAvoidedDays: input.estimatedDelayDays,
      isRecommended: false,
      isApproved: false
    }
  ];

  return options;
}
