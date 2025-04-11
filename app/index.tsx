import {
  BridgedWebView,
  createNativeBridgeContext,
  createNativeBridge,
  createStore,
  Store,
  NativeBridge,
} from "@open-game-system/app-bridge-react-native";
import { Producer, State, Event } from "@open-game-system/app-bridge-types";
import React, { useEffect, useMemo } from "react";
import { Platform, StyleSheet, Text, View, Button, NativeModules, StatusBar as RNStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import GoogleCast, {
  CastButton,
  useCastState,
  CastState,
  useDevices,
} from "react-native-google-cast";

interface CastKitState extends State {
  // Connection & Device Discovery
  castState: CastState;
  devicesAvailable: boolean;

  // Session Management
  sessionState?: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
}

type CastKitEvents =
  | { type: "CAST_STATE_CHANGED"; payload: CastState }
  | { type: "DEVICES_DISCOVERED"; payload: boolean }
  | { type: "SESSION_STARTED" }
  | { type: "SESSION_ENDED" }
  | { type: "SESSION_RESUMED" }
  | { type: 'SHOW_CAST_PICKER' };

type AppStores = {
  castKit: {
    state: CastKitState;
    events: CastKitEvents;
  };
};

// Create the bridge instance
const bridge: NativeBridge<AppStores> = createNativeBridge<AppStores>();

const castKitProducer: Producer<CastKitState, CastKitEvents> = (draft, event) => {
  switch (event.type) {
    case "CAST_STATE_CHANGED":
      draft.castState = event.payload;
      break;
    case "DEVICES_DISCOVERED":
      draft.devicesAvailable = event.payload;
      break;
    case "SESSION_STARTED":
      draft.sessionState = 'CONNECTED';
      break;
    case "SESSION_ENDED":
      draft.sessionState = 'DISCONNECTED';
      break;
    case "SESSION_RESUMED":
      draft.sessionState = 'CONNECTED';
      break;
    case 'SHOW_CAST_PICKER':
      // No state change needed here, handled by 'on' listener
      break;
  }
};

// Create and register the castKit store with 'on' config for side effects
const castKitStore = createStore<CastKitState, CastKitEvents>({
  initialState: {
    castState: CastState.NOT_CONNECTED,
    devicesAvailable: false,
    sessionState: undefined,
  },
  producer: castKitProducer,
  on: {
    SHOW_CAST_PICKER: (event: Extract<CastKitEvents, { type: 'SHOW_CAST_PICKER' }>, store: Store<CastKitState, CastKitEvents>) => {
      console.log(`[Native Store Listener] Received ${event.type}`);
      GoogleCast.showCastDialog();
    },
  }
});

// Add comprehensive store logging
castKitStore.subscribe((state) => {
  console.log('[CastKit Store] State Updated:', {
    castState: CastState[state.castState] || state.castState, // Convert enum value to string name, fallback to raw value
    devicesAvailable: state.devicesAvailable,
    sessionState: state.sessionState,
    timestamp: new Date().toISOString(),
  });
});

// Log all dispatched events
const originalDispatch = castKitStore.dispatch;
castKitStore.dispatch = (event: CastKitEvents) => {
  console.log('[CastKit Store] Dispatching Event:', {
    type: event.type,
    payload: 'payload' in event ? event.payload : undefined,
    timestamp: new Date().toISOString(),
  });
  return originalDispatch(event);
};

bridge.setStore("castKit", castKitStore);

// --- Add state logging --- 
useEffect(() => {
  console.log("[Native Store Log] Initial State:", castKitStore.getSnapshot());
  const unsubscribe = castKitStore.subscribe((newState: CastKitState) => {
    console.log("[Native Store Log] State Updated:", JSON.stringify(newState, null, 2));
  });

  // Cleanup subscription on unmount
  return () => {
    console.log("[Native Store Log] Unsubscribing logger.");
    unsubscribe();
  };
}, []); // Empty dependency array means this runs once on mount

// Create context
const BridgeContext = createNativeBridgeContext<AppStores>();
const CastContext = BridgeContext.createNativeStoreContext("castKit");

const CastStatus = () => {
  const currentCastState = CastContext.useSelector((state) => state.castState);
  const devicesAvailable = CastContext.useSelector((state) => state.devicesAvailable);
  const sessionState = CastContext.useSelector((state) => state.sessionState);

  const castStateString = 
    currentCastState === CastState.NO_DEVICES_AVAILABLE ? 'NO_DEVICES_AVAILABLE' :
    currentCastState === CastState.NOT_CONNECTED ? 'NOT_CONNECTED' :
    currentCastState === CastState.CONNECTING ? 'CONNECTING' :
    currentCastState === CastState.CONNECTED ? 'CONNECTED' :
    CastState[currentCastState] ?? 'UNKNOWN';

  return (
    <View style={styles.castStatusContainer}>
      <Text style={styles.castStatusText}>Cast State: {castStateString}</Text>
      <Text style={styles.castStatusText}>Devices Available: {devicesAvailable ? 'Yes' : 'No'}</Text>
      {sessionState && (
        <Text style={styles.castStatusText}>Session: {sessionState}</Text>
      )}
    </View>
  );
};

export default function Index() {
  // --- Hooks for native state updates --- 
  const castState = useCastState();
  const devices = useDevices();

  // Show introductory overlay on first mount
  useEffect(() => {
    GoogleCast.showIntroductoryOverlay().then(shown => {
      if (shown) {
        console.log("[Native Hook Log] Introductory overlay shown");
      } else {
        console.log("[Native Hook Log] Introductory overlay was already shown before");
      }
    }).catch(error => {
      console.error("[Native Hook Log] Failed to show introductory overlay:", error);
    });
  }, []);

  const webviewSource = useMemo(() => Platform.select({
    ios: { uri: "http://localhost:8787" }, // Use localhost for iOS simulator
    android: { uri: "http://10.0.2.2:8787" }, // Use 10.0.2.2 for Android emulator
    default: { uri: "http://localhost:8787" } // Default fallback
  }), []);

  // --- useEffect hooks for dispatching native events TO the store ---
  useEffect(() => {
    console.log("[Native Hook Log] useCastState updated:", castState);
    // Use != null to handle potential 0 state values correctly
    if (castState != null) { 
      console.log("[Native Hook Log] Dispatching CAST_STATE_CHANGED:", castState);
      castKitStore.dispatch({ type: 'CAST_STATE_CHANGED', payload: castState });
    }
  }, [castState]);

  useEffect(() => {
    console.log("[Native Hook Log] useDevices updated:", devices);
    const devicesAvailable = devices.length > 0;
    // Only dispatch if the value actually changed to avoid unnecessary logs/renders
    if (devicesAvailable !== castKitStore.getSnapshot().devicesAvailable) {
      console.log("[Native Hook Log] Dispatching DEVICES_DISCOVERED:", devicesAvailable);
      castKitStore.dispatch({ type: 'DEVICES_DISCOVERED', payload: devicesAvailable });
    }
  }, [devices]);

  // Add event listeners for session state changes
  useEffect(() => {
    const sessionManager = GoogleCast.sessionManager;

    const sessionStartedSubscription = sessionManager.onSessionStarted(() => {
      console.log("[Native Hook Log] Session Started Event");
      castKitStore.dispatch({ type: 'SESSION_STARTED' });
    });

    const sessionEndedSubscription = sessionManager.onSessionEnded(() => {
      console.log("[Native Hook Log] Session Ended Event");
      castKitStore.dispatch({ type: 'SESSION_ENDED' });
    });

    const sessionResumedSubscription = sessionManager.onSessionResumed(() => {
      console.log("[Native Hook Log] Session Resumed Event");
      castKitStore.dispatch({ type: 'SESSION_RESUMED' });
    });

    return () => {
      sessionStartedSubscription.remove();
      sessionEndedSubscription.remove();
      sessionResumedSubscription.remove();
    };
  }, []);

  return (
    <BridgeContext.BridgeProvider bridge={bridge}>
      <View style={styles.container}>
        <StatusBar style="auto" />
        <CastContext.StoreProvider>
          <View style={styles.castContainer}>
            <CastButton style={styles.castButton} />
            <CastStatus />
          </View>
          <View style={styles.webviewContainer}>
            <BridgedWebView
              bridge={bridge}
              source={webviewSource}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={true}
            />
          </View>
        </CastContext.StoreProvider>
      </View>
    </BridgeContext.BridgeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    // Use RNStatusBar for Android height, otherwise use a fixed value for iOS
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 50,
  },
  castContainer: {
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    flexDirection: 'row',
    alignItems: 'center',
  },
  castButton: {
    width: 30,
    height: 30,
    tintColor: 'black',
    marginRight: 16,
  },
  castStatusContainer: {
  },
  castStatusText: {
    fontSize: 14,
    color: "#666",
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
