import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Series } from '../protocol';
import { builtInKey, builtInPlans, Plan } from './plans';

const STORAGE_KEY = 'zweitbluete.plans.v1';

type Stored = {
  customPlans: Plan[];
  // Plan chosen per bed, keyed by `${deviceId}/${bedIndex}`. The device only
  // stores a built-in program id, so custom choices live on the phone.
  assignments: Record<string, string>;
};

const EMPTY: Stored = { customPlans: [], assignments: {} };

export type PlanDevice = { id: string; series: Series };

export function usePlans(device: PlanDevice | null) {
  const [stored, setStored] = useState<Stored>(EMPTY);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((text) => {
      if (text) {
        setStored({ ...EMPTY, ...JSON.parse(text) });
      }
    });
  }, []);

  const update = useCallback((change: (current: Stored) => Stored) => {
    setStored((current) => {
      const next = change(current);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deviceId = device?.id ?? '';
  const series: Series = device?.series ?? 'standard';

  const plans = useMemo(
    () => [...builtInPlans(series), ...stored.customPlans],
    [series, stored.customPlans],
  );

  const planForBed = useCallback(
    (bedIndex: number, programId: number): Plan => {
      const assigned = stored.assignments[`${deviceId}/${bedIndex}`];
      return (
        plans.find((plan) => plan.key === assigned) ??
        plans.find((plan) => plan.key === builtInKey(programId)) ??
        plans.find((plan) => plan.key === builtInKey(255))!
      );
    },
    [plans, stored.assignments, deviceId],
  );

  const assign = useCallback(
    (bedIndex: number, planKey: string) =>
      update((current) => ({
        ...current,
        assignments: { ...current.assignments, [`${deviceId}/${bedIndex}`]: planKey },
      })),
    [update, deviceId],
  );

  const savePlan = useCallback(
    (plan: Plan) =>
      update((current) => ({
        ...current,
        customPlans: [...current.customPlans.filter((other) => other.key !== plan.key), plan],
      })),
    [update],
  );

  const deletePlan = useCallback(
    (planKey: string) =>
      update((current) => ({
        ...current,
        customPlans: current.customPlans.filter((plan) => plan.key !== planKey),
        assignments: Object.fromEntries(
          Object.entries(current.assignments).filter(([, key]) => key !== planKey),
        ),
      })),
    [update],
  );

  return { series, plans, planForBed, assign, savePlan, deletePlan };
}

export type Plans = ReturnType<typeof usePlans>;
