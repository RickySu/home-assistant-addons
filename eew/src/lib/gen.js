import { exec } from 'child_process';
import path from 'path';
import config from '../config/config.js';
import log from '../log/logger.js';

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
export async function generateEarthquakeAudio(intensity, seconds) {
  // 原始 Python 程式碼中的設定
  let audioSource = config.audio.source;
  let audioTarget = config.audio.target;
  let countDelay = config.delay.countdown;
  let playDelay = config.delay.play;

  // 處理輸入參數
  const totalSeconds = parseInt(seconds, 10);
  const intensityStr = String(intensity);

  if (isNaN(totalSeconds)) {
    throw new Error("Seconds 錯誤的時間。");
  }

  const level = intensityStr.substring(0, 1); // e.g., "5" from "5+"
  const strong = intensityStr.substring(1, 2); // e.g., "+" from "5+"
  const intensityDict = {
    "-": "intensity-weak.ogg",
    "+": "intensity-strong.ogg",
    "": "intensity.ogg"
  };

  let audios = [];
  let effectiveSeconds = totalSeconds - countDelay - playDelay;

  // 1. 強度級別 (e.g., "5.ogg")
  audios.push(`${level}.ogg`);

  // 2. 強弱程度 (e.g., "intensity-strong.ogg")
  audios.push(intensityDict[strong] || intensityDict[""]); // 確保有預設值

  audios.push('silent.ogg');
  effectiveSeconds--;

  log({ label: 'gen/audio', message: `intensity: ${intensity}, seconds: ${seconds} audios: ${JSON.stringify(audios)}` })

  if(effectiveSeconds >= 20) {
    audios.push(`${Math.floor(effectiveSeconds / 10)}x.ogg`);
    audios.push(`x${effectiveSeconds % 10}.ogg`);
    audios.push('second.ogg');
    effectiveSeconds -= 2;
  }
  else if(effectiveSeconds > 10) {
    audios.push('silent.ogg');
    audios.push(`x${effectiveSeconds % 10}.ogg`);
    audios.push('second.ogg');
    effectiveSeconds -= 2;
  }
  else if(effectiveSeconds > 0){
    audios.push(`${effectiveSeconds}.ogg`);
    audios.push('second.ogg');
    effectiveSeconds -= 2;
  }

  while(effectiveSeconds > 0) {
    if((effectiveSeconds % 10) == 0 && effectiveSeconds >= 20) {
      audios.push(`${Math.floor(effectiveSeconds / 10)}x.ogg`);
      audios.push(`x${effectiveSeconds % 10}.ogg`);
      audios.push('silent.ogg');
      effectiveSeconds -= 1;
      continue;
    }
    if(effectiveSeconds <= 10) {
      audios.push(`${effectiveSeconds}.ogg`);
      audios.push('silent.ogg');
      effectiveSeconds--;
      continue;
    }
    audios.push('ding.ogg');
    effectiveSeconds--;
  }

  audios.push('arrive.ogg');

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
