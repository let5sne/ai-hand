import { Camera } from '@mediapipe/camera_utils';

const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingElement = document.getElementById('loading');

// 状态管理
let isLoaded = false;
let hue = 0; // 色相轮

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

// 核心渲染循环
function onResults(results) {
  if (!isLoaded) {
    isLoaded = true;
    loadingElement.style.display = 'none';
  }

  // 策略：有手时全黑背景显光效，无手时显示暗淡视频背景
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
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
    canvasCtx.fillText('请在摄像头前挥挥手 👋', 0, 0);
    canvasCtx.restore();
  }

  // 2. 更新全局色相
  hue = (hue + 1) % 360;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
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

// 初始化 Camera
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({image: videoElement});
  },
  width: 1280,
  height: 720
});

camera.start().catch(err => {
  console.error(err);
  loadingElement.innerText = '无法启动摄像头: ' + err.message;
});
