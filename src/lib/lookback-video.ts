/** Saves the Look Back as an MP4 on this device: the player's frames + the tune, encoded with WebCodecs. */
import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
} from "mediabunny";
import { drawFrame, loadPictures, prepareLook } from "@/lib/lookback-draw";
import { renderLookBackMusic } from "@/lib/lookback-music";
import { slideAt, timeline, type Slide } from "@/lib/lookback-story";
import { nextTask } from "@/lib/memory-book";

const FPS = 30;
const WIDTH = 720;
const HEIGHT = 1280;
const VIDEO_BITRATE = 3_000_000; // ~22 MB a minute: sharp on a phone, small enough to send

export type VideoProgress = { step: "photos" | "frames"; done: number; total: number };

export async function makeLookBackVideo(
  slides: Slide[],
  name: string,
  onProgress: (p: VideoProgress) => void,
): Promise<{ file: File; music: boolean; seconds: number }> {
  // H.264 first: it plays everywhere (iPhone, Instagram, Messenger).
  const videoCodec = await getFirstEncodableVideoCodec(["avc", "hevc", "vp9", "av1"], {
    width: WIDTH,
    height: HEIGHT,
    bitrate: VIDEO_BITRATE,
    frameRate: FPS,
  });
  if (!videoCodec) {
    throw new Error(
      "This phone or browser can't make videos. Try a newer phone, or Chrome on a computer.",
    );
  }
  const audioCodec = await getFirstEncodableAudioCodec(["aac", "opus"], {
    numberOfChannels: 2,
    sampleRate: 48_000,
    bitrate: 128_000,
  });

  const look = await prepareLook();
  const pics = await loadPictures(slides, (done, total) =>
    onProgress({ step: "photos", done, total }),
  );
  const { starts, total } = timeline(slides);
  const seconds = total / 1000;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });
  const video = new CanvasSource(canvas, {
    codec: videoCodec,
    bitrate: VIDEO_BITRATE,
    keyFrameInterval: 2,
  });
  output.addVideoTrack(video, { frameRate: FPS });
  const audio = audioCodec ? new AudioBufferSource({ codec: audioCodec, bitrate: 128_000 }) : null;
  if (audio) output.addAudioTrack(audio);

  await output.start();
  try {
    if (audio) await audio.add(await renderLookBackMusic(seconds));
    const frames = Math.ceil(seconds * FPS);
    for (let f = 0; f < frames; f++) {
      const { index, t } = slideAt(starts, (f * 1000) / FPS);
      drawFrame(ctx, look, pics, slides, index, t);
      await video.add(f / FPS, 1 / FPS);
      if (f % 10 === 0) {
        onProgress({ step: "frames", done: f, total: frames });
        await nextTask(); // let the progress bar paint
      }
    }
    await output.finalize();
  } catch (e) {
    await output.cancel();
    throw e;
  }
  return {
    file: new File([output.target.buffer!], name, { type: "video/mp4" }),
    music: !!audio,
    seconds,
  };
}
