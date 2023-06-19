import {
  ImageSegmenter,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js";

const defaultColorStops = [
  [
    [9, 117, 190],
    [59, 160, 89],
    [230, 192, 39],
    [238, 30, 77],
  ],
  [
    [205, 24, 75],
    [33, 98, 155],
    [64, 149, 69],
    [228, 171, 33],
  ],
];

const defaultHatena = [
  [0, 0, 0.5],
  [1, 0, 1],
  [2, 0, 1],
  [3, 0, 0],
  [0, 1, 0.5],
  [1, 1, 0.5],
  [2, 1, 0.5],
  [3, 1, 1],
  [0, 2, 0],
  [1, 2, 0.5],
  [2, 2, 1],
  [3, 2, 1],
  [0, 3, 1],
  [1, 3, 0],
  [2, 3, 0.5],
  [3, 3, 0.5],

  [4, 2, 0.5],
  [5, 2, 1],
  [6, 2, 1],
  [7, 2, 0],
  [4, 3, 0.5],
  [5, 3, 0.5],
  [6, 3, 0.5],
  [7, 3, 1],
  [4, 4, 0],
  [5, 4, 0.5],
  [6, 4, 1],
  [7, 4, 1],
  [4, 5, 1],
  [5, 5, 0],
  [6, 5, 0.5],
  [7, 5, 0.5],

  [0, 13, 0.5],
  [1, 13, 1],
  [2, 13, 1],
  [3, 13, 0],
  [0, 14, 0.5],
  [1, 14, 0.5],
  [2, 14, 0.5],
  [3, 14, 1],
  [0, 15, 0],
  [1, 15, 0.5],
  [2, 15, 1],
  [3, 15, 1],
  [0, 16, 1],
  [1, 16, 0],
  [2, 16, 0.5],
  [3, 16, 0.5],

  [4, 15, 0.5],
  [5, 15, 1],
  [6, 15, 1],
  [7, 15, 0],
  [4, 16, 0.5],
  [5, 16, 0.5],
  [6, 16, 0.5],
  [7, 16, 1],
  [4, 17, 0],
  [5, 17, 0.5],
  [6, 17, 1],
  [7, 17, 1],
  [4, 18, 1],
  [5, 18, 0],
  [6, 18, 0.5],
  [7, 18, 0.5],
];

export function gradient(
  context,
  width,
  height,
  step,
  colorStops = defaultColorStops
) {
  const stopLength = colorStops[0].length - 1;

  let currentStop = 0;
  let currentUnit = 0;

  return () => {
    const gradient = context.createLinearGradient(0, width, height, 0);

    for (let i = 0; i < colorStops.length; i++) {
      const stop = colorStops[i];
      const [sR, sG, sB] = stop[currentStop];
      const [eR, eG, eB] = stop[currentStop < stopLength ? currentStop + 1 : 0];

      const r = Math.floor(lerp(sR, eR, currentUnit));
      const g = Math.floor(lerp(sG, eG, currentUnit));
      const b = Math.floor(lerp(sB, eB, currentUnit));

      gradient.addColorStop(i, `rgb(${r},${g},${b})`);
    }

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    if (currentUnit >= 1) {
      currentUnit = 0;
      currentStop = currentStop < stopLength ? currentStop + 1 : 0;
    }
    currentUnit += step;
  };
}

function lerp(a, b, u) {
  return (1 - u) * a + u * b;
}

export function dots(
  context,
  x = 0,
  y = 120,
  angle = -45,
  scale = 40,
  size = 15,
  dots = defaultHatena
) {
  return () => {
    context.save();

    context.translate(x, y);
    context.rotate((angle * Math.PI) / 180);

    for (let i = 0; i < dots.length; i++) {
      const [x, y, a] = dots[i];
      context.beginPath();
      context.arc(x * scale, y * scale, size, 0, Math.PI * 2);
      context.fillStyle = `rgba(255,255,255,${a})`;
      context.fill();
    }

    context.restore();
  };
}

export async function segment(video, context, width, height) {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  const imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });

  return (callback) => {
    const currentData = context.getImageData(0, 0, width, height).data;

    context.drawImage(video, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height).data;

    imageSegmenter.segmentForVideo(video, performance.now(), (result) => {
      const mask = result.categoryMask.getAsFloat32Array();

      callback(mask, currentData, imageData);

      const image = new Uint8ClampedArray(imageData.buffer);
      const dataNew = new ImageData(image, width, height);
      context.putImageData(dataNew, 0, 0);
    });
  };
}

export async function demo(step, callback) {
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
    return alert("getUserMedia() is not supported by your browser");
  }

  const video = document.querySelector("video");

  video.srcObject = await navigator.mediaDevices.getUserMedia({
    video: true,
  });

  video.addEventListener("loadeddata", async () => {
    const width = video.videoWidth;
    const height = video.videoHeight;

    const canvas = document.querySelector("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    const background = gradient(context, width, height, step);
    const hatena = dots(context);
    const render = await segment(video, context, width, height);

    let time = -1;
    function run() {
      requestAnimationFrame(run);

      if (video.currentTime === time) {
        return;
      }
      time = video.currentTime;

      callback(background, hatena, render);
    }
    run();
  });
}
