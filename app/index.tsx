import {
  createNativeBridge,
  createNativeBridgeContext,
  createStore,
} from "@open-game-system/app-bridge-react-native";
import React from "react";
import { Text, View } from "react-native";
import { WebView } from "react-native-webview";

type AppStores = {
  castKit: {
    state: {
      isCasting: boolean;
    };
    events: {
      type: "CAST";
    };
  };
};

const bridge = createNativeBridge<AppStores>();

const store = createStore({
  initialState: {
    isCasting: true,
  },
});

bridge.setStore("castKit", store);

const BridgeContext = createNativeBridgeContext<AppStores>();

const CastContext = BridgeContext.createNativeStoreContext("castKit");

export default function Index() {
  const CastStatus = () => {
    const isCasting = CastContext.useSelector((state) => state.isCasting);

    return <Text>{isCasting ? "Casting" : "Not Casting"}</Text>;
  };

  return (
    <BridgeContext.BridgeProvider bridge={bridge}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CastContext.StoreProvider>
          <CastStatus />
          <WebView source={{ uri: "https://triviajam.tv" }} />
        </CastContext.StoreProvider>
      </View>
    </BridgeContext.BridgeProvider>
  );
}
