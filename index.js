import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";
import { RefreshProvider } from "~/components/RefreshProvider";
import "react-native-get-random-values"; // <<<< ADD THIS LINE AT THE VERY TOP

// https://docs.expo.dev/router/reference/troubleshooting/#expo_router_app_root-not-defined

// Must be exported or Fast Refresh won't update the context
export function App() {
  const ctx = require.context("./app");

  // Default refreshForm for app-level RefreshProvider
  const defaultRefreshForm = () => {
    console.log("App-level default refreshForm called");
  };

  return (
    <RefreshProvider refreshForm={defaultRefreshForm}>
      <ExpoRoot context={ctx} />
    </RefreshProvider>
  );
}

registerRootComponent(App);
