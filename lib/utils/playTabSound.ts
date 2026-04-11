import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

let sound: Audio.Sound | null = null;

export async function preloadTabClickSound() {
  try {
    if (sound) return;

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      shouldDuckAndroid: true,
    });

    const res = await Audio.Sound.createAsync(
      require("../../assets/sounds/click.wav"),
      { volume: 0.6 }
    );

    sound = res.sound;
  } catch {
    // If sound fails, don't break UX
  }
}

export async function playTabClickSound() {
  try {
    void Haptics.selectionAsync();

    if (!sound) await preloadTabClickSound();
    if (!sound) return;

    await sound.replayAsync();
  } catch {
    // ignore
  }
}

export async function unloadTabClickSound() {
  try {
    if (!sound) return;
    await sound.unloadAsync();
    sound = null;
  } catch {}
}
