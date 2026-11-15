import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { newCustomPlan, Plan, programIdOf } from './src/plants/plans';
import { Bed } from './src/protocol';
import { usePlans } from './src/plants/usePlans';
import { GardenScreen } from './src/screens/GardenScreen';
import { PlanEditorScreen } from './src/screens/PlanEditorScreen';
import { PlansScreen } from './src/screens/PlansScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { useTheme } from './src/theme';
import { Garden, useGarden } from './src/useGarden';

type Route =
  | { screen: 'garden' }
  | { screen: 'plans'; bedIndex: number; starting: boolean }
  | { screen: 'editor'; bedIndex: number; starting: boolean; plan: Plan; isNew: boolean };

function withBed(beds: [Bed, Bed], index: number, bed: Bed): [Bed, Bed] {
  return index === 0 ? [bed, beds[1]] : [beds[0], bed];
}

export default function App() {
  const theme = useTheme();
  const { bluetoothOn, permitted, state, error, connect, disconnect, saveLight, saveBeds } = useGarden();
  const garden = state.phase === 'connected' ? state.garden : null;
  const plans = usePlans(
    garden ? { id: garden.id, defaultModel: garden.sensorConfig.tds > 0 ? 'M' : 'E' } : null,
  );
  const [route, setRoute] = useState<Route>({ screen: 'garden' });

  const connected = (garden: Garden) => {
    if (route.screen === 'plans') {
      const { bedIndex, starting } = route;
      const bed = garden.beds[bedIndex];
      const current = starting ? null : plans.planForBed(bedIndex, bed.programId);
      return (
        <PlansScreen
          plans={plans}
          bedIndex={bedIndex}
          starting={starting}
          selectedKey={current?.key ?? null}
          onSelect={(plan) => {
            plans.assign(bedIndex, plan.key);
            saveBeds(
              withBed(garden.beds, bedIndex, {
                startedAt: starting ? new Date() : bed.startedAt,
                programId: programIdOf(plan),
              }),
            );
            setRoute({ screen: 'garden' });
          }}
          onEdit={(plan) => setRoute({ screen: 'editor', bedIndex, starting, plan, isNew: false })}
          onCreate={() =>
            setRoute({
              screen: 'editor',
              bedIndex,
              starting,
              plan: newCustomPlan(Date.now().toString(36)),
              isNew: true,
            })
          }
          onBack={() => setRoute({ screen: 'garden' })}
        />
      );
    }
    if (route.screen === 'editor') {
      const { bedIndex, starting } = route;
      const backToPlans = () => setRoute({ screen: 'plans', bedIndex, starting });
      return (
        <PlanEditorScreen
          plan={route.plan}
          isNew={route.isNew}
          onSave={(plan) => {
            plans.savePlan(plan);
            backToPlans();
          }}
          onDelete={(plan) => {
            plans.deletePlan(plan.key);
            backToPlans();
          }}
          onBack={backToPlans}
        />
      );
    }
    return (
      <GardenScreen
        garden={garden}
        plans={plans}
        error={error}
        onSaveLight={saveLight}
        onChoosePlan={(bedIndex) => setRoute({ screen: 'plans', bedIndex, starting: false })}
        onStartBed={(bedIndex) => setRoute({ screen: 'plans', bedIndex, starting: true })}
        onEmptyBed={(bedIndex) =>
          saveBeds(withBed(garden.beds, bedIndex, { startedAt: null, programId: 0 }))
        }
        onDisconnect={disconnect}
      />
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar style="auto" />
        {state.phase === 'connected' ? (
          connected(state.garden)
        ) : (
          <ScanScreen
            bluetoothOn={bluetoothOn}
            permitted={permitted}
            found={state.phase === 'scanning' ? state.found : []}
            connectingTo={state.phase === 'connecting' ? state.name : null}
            error={error}
            onConnect={connect}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
