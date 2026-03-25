import { requireOptionalNativeModule } from "expo-modules-core";

export type EvcSmsPayload = {
  sender: string;
  body: string;
};

/** Native module `ExpoEvcSms`; null when not linked (e.g. web) or unavailable. */
const ExpoEvcSms = requireOptionalNativeModule<{
  setListeningEnabled: (enabled: boolean) => Promise<void>;
  getListeningEnabled: () => boolean;
  addListener: (
    eventName: "onEvcSms",
    listener: (payload: EvcSmsPayload) => void,
  ) => { remove: () => void };
}>("ExpoEvcSms");

export default ExpoEvcSms;
