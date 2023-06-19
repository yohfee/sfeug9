import { demo } from "../script.js";

await demo(0.5, (background, hatena, render) => {
  background();

  render((mask, currentData, imageData) => {
    for (let i = 0; i < mask.length; ++i) {
      if (mask[i] === 0) {
        const n = i * 4;
        imageData[n] = (currentData[n] + imageData[n]) / 2;
        imageData[n + 1] = (currentData[n + 1] + imageData[n + 1]) / 2;
        imageData[n + 2] = (currentData[n + 2] + imageData[n + 1]) / 2;
        imageData[n + 3] = (currentData[n + 3] + imageData[n + 1]) / 2;
      }
    }
  });

  hatena();
});
