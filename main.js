import { Camera } from '@mediapipe/camera_utils';

const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingElement = document.getElementById('loading');

// 状态管理
let isLoaded = false;
let faceLoaded = false;
let hue = 0; // 色相轮
let faceHue = 180; // 人脸用不同色相

// 调整 Canvas 尺寸
function resizeCanvas() {
  canvasElement.width = window.innerWidth;
  canvasElement.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 粒子系统
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 5 + 2;
    this.speedX = Math.random() * 4 - 2;
    this.speedY = Math.random() * 4 - 2;
    this.color = color;
    this.life = 1.0; // 生命值 1.0 -> 0.0
    this.decay = Math.random() * 0.03 + 0.01;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life -= this.decay;
    this.size *= 0.95; // 变小
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

const particles = [];

function emitParticles(x, y) {
  const color = `hsl(${hue}, 100%, 50%)`;
  for (let i = 0; i < 2; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function handleParticles() {
  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw(canvasCtx);
    if (particles[i].life <= 0 || particles[i].size <= 0.1) {
      particles.splice(i, 1);
      i--;
    }
  }
}

// 绘制连线
function drawConnections(landmarks) {
  canvasCtx.lineWidth = 3;
  canvasCtx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
  canvasCtx.shadowBlur = 10;
  canvasCtx.shadowColor = `hsl(${hue}, 100%, 50%)`;

  for (const connection of HAND_CONNECTIONS) {
    const start = landmarks[connection[0]];
    const end = landmarks[connection[1]];
    
    // 映射坐标
    const x1 = start.x * canvasElement.width;
    const y1 = start.y * canvasElement.height;
    const x2 = end.x * canvasElement.width;
    const y2 = end.y * canvasElement.height;

    canvasCtx.beginPath();
    canvasCtx.moveTo(x1, y1);
    canvasCtx.lineTo(x2, y2);
    canvasCtx.stroke();
  }
  
  // 重置阴影
  canvasCtx.shadowBlur = 0;
}

// 绘制关节
function drawLandmarks(landmarks) {
  canvasCtx.fillStyle = '#fff';
  for (const landmark of landmarks) {
    const x = landmark.x * canvasElement.width;
    const y = landmark.y * canvasElement.height;
    
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 4, 0, Math.PI * 2);
    canvasCtx.fill();
  }
}

// 指尖索引: 拇指, 食指, 中指, 无名指, 小指
const FINGER_TIPS = [4, 8, 12, 16, 20];

// FaceMesh 连接线 (简化版 - 面部轮廓 + 眼睛 + 嘴巴)
const FACEMESH_TESSELATION = [
  // 面部轮廓
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172], [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10],
  // 左眼
  [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154], [154, 155], [155, 133], [133, 173], [173, 157], [157, 158], [158, 159], [159, 160], [160, 161], [161, 246], [246, 33],
  // 右眼
  [362, 382], [382, 381], [381, 380], [380, 374], [374, 373], [373, 390], [390, 249], [249, 263], [263, 466], [466, 388], [388, 387], [387, 386], [386, 385], [385, 384], [384, 398], [398, 362],
  // 嘴巴外圈
  [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405], [405, 321], [321, 375], [375, 291], [291, 409], [409, 270], [270, 269], [269, 267], [267, 0], [0, 37], [37, 39], [39, 40], [40, 185], [185, 61],
  // 嘴巴内圈
  [78, 95], [95, 88], [88, 178], [178, 87], [87, 14], [14, 317], [317, 402], [402, 318], [318, 324], [324, 308], [308, 415], [415, 310], [310, 311], [311, 312], [312, 13], [13, 82], [82, 81], [81, 80], [80, 191], [191, 78]
];

// 存储人脸结果，供统一渲染
let latestFaceResults = null;

// 绘制人脸网格
function drawFaceMesh(landmarks) {
  canvasCtx.lineWidth = 1;
  canvasCtx.strokeStyle = `hsla(${faceHue}, 100%, 70%, 0.6)`;
  canvasCtx.shadowBlur = 5;
  canvasCtx.shadowColor = `hsl(${faceHue}, 100%, 50%)`;

  for (const connection of FACEMESH_TESSELATION) {
    const start = landmarks[connection[0]];
    const end = landmarks[connection[1]];
    if (!start || !end) continue;
    
    const x1 = start.x * canvasElement.width;
    const y1 = start.y * canvasElement.height;
    const x2 = end.x * canvasElement.width;
    const y2 = end.y * canvasElement.height;

    canvasCtx.beginPath();
    canvasCtx.moveTo(x1, y1);
    canvasCtx.lineTo(x2, y2);
    canvasCtx.stroke();
  }
  
  canvasCtx.shadowBlur = 0;
}

// 绘制人脸关键点 (只画眼睛和嘴巴的关键点)
const FACE_KEY_POINTS = [33, 133, 362, 263, 61, 291, 0, 17]; // 眼角、嘴角
function drawFaceKeyPoints(landmarks) {
  canvasCtx.fillStyle = `hsl(${faceHue}, 100%, 80%)`;
  for (const idx of FACE_KEY_POINTS) {
    const point = landmarks[idx];
    if (!point) continue;
    const x = point.x * canvasElement.width;
    const y = point.y * canvasElement.height;
    
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 3, 0, Math.PI * 2);
    canvasCtx.fill();
  }
}

// FaceMesh 结果回调
function onFaceResults(results) {
  if (!faceLoaded) {
    faceLoaded = true;
  }
  latestFaceResults = results;
}

// 核心渲染循环 (手部)
function onResults(results) {
  if (!isLoaded) {
    isLoaded = true;
    loadingElement.style.display = 'none';
  }

  const hasHands = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
  const hasFace = latestFaceResults && latestFaceResults.multiFaceLandmarks && latestFaceResults.multiFaceLandmarks.length > 0;

  // 策略：有手或脸时全黑背景显光效，都没有时显示暗淡视频背景
  if (hasHands || hasFace) {
    // 拖尾模式：叠加半透明黑色
    canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
  } else {
    // 待机模式：显示微弱的视频背景
    canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.3)'; 
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    
    canvasCtx.save();
    canvasCtx.globalAlpha = 0.2; // 20% 亮度的视频
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();

    // 显示提示文字
    canvasCtx.save();
    const cx = canvasElement.width / 2;
    const cy = canvasElement.height / 2;
    
    canvasCtx.translate(cx, cy);
    canvasCtx.scale(-1, 1); // 修正镜像翻转，让文字正向显示
    canvasCtx.font = '30px sans-serif';
    canvasCtx.fillStyle = '#0ff';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText('请在摄像头前挥挥手或露脸 👋😊', 0, 0);
    canvasCtx.restore();
  }

  // 更新全局色相
  hue = (hue + 1) % 360;
  faceHue = (faceHue + 0.5) % 360;

  // 绘制人脸
  if (hasFace) {
    for (const landmarks of latestFaceResults.multiFaceLandmarks) {
      drawFaceMesh(landmarks);
      drawFaceKeyPoints(landmarks);
    }
  }

  // 绘制手部
  if (hasHands) {
    for (const landmarks of results.multiHandLandmarks) {
      drawConnections(landmarks);
      drawLandmarks(landmarks);
      for (const index of FINGER_TIPS) {
        const tip = landmarks[index];
        const x = tip.x * canvasElement.width;
        const y = tip.y * canvasElement.height;
        emitParticles(x, y);
      }
    }
  }

  handleParticles();
}

// 初始化 Hands
// 使用本地 public/mediapipe 目录下的文件，避免 CDN 网络问题
// Hands / Camera 都由 public/mediapipe 下的脚本作为全局变量提供
const hands = new Hands({
  locateFile: (file) => {
    return `./mediapipe/${file}`;
  }
});

// 加载超时处理
setTimeout(() => {
  if (!isLoaded) {
    loadingElement.innerText = '模型加载慢，请耐心等待...\n(如果超过 1分钟 请刷新)';
    loadingElement.style.color = '#ff0';
    // 也可以在这里提示用户本地文件是否成功加载
  }
}, 5000);

setTimeout(() => {
  if (!isLoaded) {
    loadingElement.innerText = '加载失败。请检查控制台 (F12) 错误信息。';
    loadingElement.style.color = 'red';
  }
}, 30000);

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// 初始化 FaceMesh
const faceMesh = new FaceMesh({
  locateFile: (file) => {
    return `./mediapipe/${file}`;
  }
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults(onFaceResults);

// 初始化 Camera
const camera = new Camera(videoElement, {
  onFrame: async () => {
    // 串行发送，避免 WASM 模块冲突
    await hands.send({image: videoElement});
    await faceMesh.send({image: videoElement});
  },
  width: 1280,
  height: 720
});

// 串行初始化模型，避免 WASM 冲突
async function initModels() {
  try {
    // 先初始化 Hands
    await hands.initialize();
    console.log('Hands model loaded');
    
    // 再初始化 FaceMesh
    await faceMesh.initialize();
    console.log('FaceMesh model loaded');
    
    // 两个模型都加载完成后启动摄像头
    await camera.start();
    console.log('Camera started');
  } catch (err) {
    console.error(err);
    loadingElement.innerText = '加载失败: ' + err.message;
  }
}

initModels();
