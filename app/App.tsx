import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { t } from './src/i18n';
import { newCustomPlan, Plan, programIdOf } from './src/plants/plans';
import { Bed, BED_START_EC, firmwareAtLeast } from './src/protocol';
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
  const {
    bluetoothOn,
    permitted,
    state,
    error,
    nothingFound,
    calibration,
    nutrientCalibration,
    connect,
    disconnect,
    saveLight,
    saveBeds,
    saveSensorBar,
    calibrateFillLevel,
    calibrateNutrientSensor,
    setUserNutrientBaseline,
  } = useGarden();
  const garden = state.phase === 'connected' ? state.garden : null;
  const plans = usePlans(
    garden ? { id: garden.id, defaultModel: garden.sensorConfig.tds > 0 ? 'M' : 'E' } : null,
  );
  const [route, setRoute] = useState<Route>({ screen: 'garden' });

  const connected = (garden: Garden) => {
    const userNutrientCalibration =
      garden.sensorConfig.tds > 0 && firmwareAtLeast(garden.firmware, 1, 6);
    if (route.screen === 'plans') {
      const { bedIndex, starting } = route;
      const bed = garden.beds[bedIndex];
      const current = starting ? null : plans.planForBed(bedIndex, bed.programId);
      const factoryEc = garden.status?.factoryEc ?? 0;
      return (
        <PlansScreen
          plans={plans}
          bedIndex={bedIndex}
          starting={starting}
          selectedKey={current?.key ?? null}
          onSelect={(plan) => {
            const apply = () => {
              plans.assign(bedIndex, plan.key);
              saveBeds(
                withBed(garden.beds, bedIndex, {
                  startedAt: starting ? new Date() : bed.startedAt,
                  programId: programIdOf(plan),
                }),
              );
              if (starting && factoryEc > 0 && userNutrientCalibration) {
                setUserNutrientBaseline(true);
              }
              setRoute({ screen: 'garden' });
            };
            // As in the original app: water that already reads high before any
            // fertiliser is added gets a warning first.
            if (starting && userNutrientCalibration && factoryEc >= BED_START_EC) {
              Alert.alert(t('hard_water_title'), t('hard_water_message'), [
                { text: t('cancel'), style: 'cancel' },
                { text: t('hard_water_confirm'), onPress: apply },
              ]);
            } else {
              apply();
            }
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
        calibration={calibration}
        nutrientCalibration={nutrientCalibration}
        onCalibrate={calibrateFillLevel}
        onCalibrateNutrient={calibrateNutrientSensor}
        onSaveSensorBar={saveSensorBar}
        onSaveLight={saveLight}
        onChoosePlan={(bedIndex) => setRoute({ screen: 'plans', bedIndex, starting: false })}
        onStartBed={(bedIndex) => setRoute({ screen: 'plans', bedIndex, starting: true })}
        onChangeStart={(bedIndex, startedAt) =>
          saveBeds(withBed(garden.beds, bedIndex, { ...garden.beds[bedIndex], startedAt }))
        }
        onEmptyBed={(bedIndex) => {
          saveBeds(withBed(garden.beds, bedIndex, { startedAt: null, programId: 0 }));
          if (userNutrientCalibration) {
            setUserNutrientBaseline(false);
          }
        }}
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
            nothingFound={nothingFound}
            error={error}
            onConnect={connect}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
