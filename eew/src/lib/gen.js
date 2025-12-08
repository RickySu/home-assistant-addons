import { exec } from 'child_process';
import path from 'path';
import config from '../config/config.js';

/**
 * 執行 shell 命令並返回 Promise。
 * @param {string} command 要執行的命令
 * @returns {Promise<void>}
 */
function execShellCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`執行錯誤: ${error.message}`);
        console.error(`Stderr: ${stderr}`);
        return reject(error);
      }
      // console.log(`Stdout: ${stdout}`);
      resolve();
    });
  });
}

/**
 * 根據地震強度和持續時間生成 FFmpeg 命令所需的音訊連結字串。
 * @param {number} seconds - 持續時間（秒）。
 * @param {string} intensity - 強度字串，例如 "5+" 或 "4-", "5"。
 * @returns {Promise<string>} FFmpeg 命令執行的結果。
 */
export async function generateEarthquakeAudio(seconds, intensity) {
  // 原始 Python 程式碼中的設定
  let audioSource = config.audio.source;
  let audioTarget = config.audio.target;
  let countDelay = config.delay.countdown;
  let playDelay = config.delay.play;

  // 處理輸入參數
  const totalSeconds = parseInt(seconds, 10);
  const intensityStr = String(intensity);

  if (isNaN(totalSeconds) || totalSeconds <= 0) {
    throw new Error("Seconds 必須是一個大於 0 的數字。");
  }

  const level = intensityStr.substring(0, 1); // e.g., "5" from "5+"
  const strong = intensityStr.substring(1, 2); // e.g., "+" from "5+"
  const intensityDict = {
    "-": "intensity-weak.ogg",
    "+": "intensity-strong.ogg",
    "": "intensity.ogg"
  };

  let audios = [];

  // 1. 強度級別 (e.g., "5.ogg")
  audios.push(level + ".ogg");

  // 2. 強弱程度 (e.g., "intensity-strong.ogg")
  audios.push(intensityDict[strong] || intensityDict[""]); // 確保有預設值

  // 計算實際執行提示音效的秒數
  let effectiveSeconds = totalSeconds - countDelay - playDelay;

  if (effectiveSeconds > 0) {
    // 3. 提示秒數
    if (effectiveSeconds < 10) {
      audios.push(String(effectiveSeconds) + ".ogg");
    } else {
      // "x" + (seconds % 10) + ".ogg"
      audios.push("x" + String(effectiveSeconds % 10) + ".ogg");
    }

    // 4. "second.ogg"
    audios.push("second.ogg");

    // 決定開始蜂鳴提示的倒數秒數
    let countdown;
    if (effectiveSeconds >= 10) {
      countdown = 10;
    } else {
      countdown = effectiveSeconds % 10;
    }

    // 5. 較長持續時間的 "ding.ogg" 區塊
    // 原始 Python 邏輯: for i in range(0, seconds - 10)
    // 這裡的 seconds 應為 effectiveSeconds
    for (let i = 0; i < effectiveSeconds - 10; i++) {
      audios.push("ding.ogg");
    }

    // 6. 倒數計時音效
    if (countdown === 10) {
      // Python 邏輯: x0.ogg, silent.ogg
      audios.push("x0.ogg");
      audios.push("silent.ogg");
    }

    // Python 邏輯: for i in range(countdown - 1, 0, -1)
    for (let i = countdown - 1; i > 0; i--) {
      audios.push(String(i) + ".ogg");
      audios.push("silent.ogg");
    }
  }

  // 7. "arrive.ogg"
  audios.push("arrive.ogg");

  // 8. 最後 5 個 "ding.ogg"
  for (let i = 0; i < 5; i++) {
    audios.push("ding.ogg");
  }

  // --- FFmpeg 命令建構 ---

  let audioConcat = "";
  // 將所有音訊檔名轉換為帶路徑的 "-i" 參數
  audios.forEach(audio => {
    // 使用 path.join 確保路徑正確
    const fullPath = path.join(audioSource, audio);
    audioConcat += ` -i "${fullPath}"`;
  });

  let mapping = "";
  // 建立 [0:a][1:a]... 映射字串
  for (let i = 0; i < audios.length; i++) {
    mapping += `[${i}:a]`;
  }

  const filterComplex = `"${mapping}concat=n=${audios.length}:v=0:a=1"`;

  // 最終 FFmpeg 命令
  const command = `ffmpeg -y ${audioConcat} -filter_complex ${filterComplex} "${audioTarget}"`;

  // 執行命令
  console.log("正在執行 FFmpeg 命令...");
  console.log(command);
  await execShellCommand(command);

  return `成功生成音訊到: ${audioTarget}`;
}

// 範例用法 (可以作為一個單獨的檔案來測試)
// if (require.main === module) {
//     const exampleSeconds = 15;
//     const exampleIntensity = "4+";
//     generateEarthquakeAudio(exampleSeconds, exampleIntensity)
//         .then(result => console.log(result))
//         .catch(err => console.error("音訊生成失敗:", err));
// }

export default generateEarthquakeAudio;
