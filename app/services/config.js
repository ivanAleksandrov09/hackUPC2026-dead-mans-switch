// Bridge URL.
// - On web: browser runs on the same machine as the bridge → use localhost.
// - On phone: phone is on the LAN → use the laptop's LAN IP.
//   Find it with:
//     Windows:  ipconfig | findstr IPv4
//     Mac/Linux: ifconfig | grep "inet "
import { Platform } from "react-native";

export const BRIDGE_URL =
  Platform.OS === "web"
    ? "ws://localhost:3001"
    : "ws://10.167.110.187:3001";
