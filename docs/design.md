# 设计文档

## 技术栈
- **构建工具**: Vite 5.x
- **语言**: HTML5, CSS3, JavaScript (ES6+)
- **核心库**:
    - `@mediapipe/hands`: 手部追踪 AI 模型
    - `@mediapipe/camera_utils`: 摄像头控制
    - `@vitejs/plugin-basic-ssl`: HTTPS 支持

## 架构设计

### 模块划分
1. **VideoInput**: 隐藏的 `<video>` 元素，用于采集原始图像。
2. **GestureRecognition**: MediaPipe Hands 封装，输入视频帧，输出 21 个手部关键点坐标。
3. **Renderer**: HTML5 Canvas 渲染引擎。
    - `drawConnections()`: 绘制霓虹骨架连线
    - `drawLandmarks()`: 绘制关节点
    - `Particle` 类: 粒子系统，指尖拖尾效果
4. **Loop**: `requestAnimationFrame` 驱动的渲染循环

### 数据流
```
摄像头 → Video 元素 → MediaPipe AI → 21个关键点 → Canvas 渲染
```

## 视觉风格
- **背景**: 深黑色，突出光效
- **骨架**: HSL 色相轮动态变色（霓虹效果）
- **粒子**: 指尖发射，随机飘散并衰减
- **残影**: 半透明黑色叠加实现拖尾

## 部署配置

### HTTPS (手机访问必需)
浏览器安全策略要求非 localhost 访问摄像头必须使用 HTTPS。

`vite.config.js`:
```javascript
import basicSsl from '@vitejs/plugin-basic-ssl';
export default defineConfig({
  plugins: [basicSsl()],
  server: { host: true, https: true }
});
```

### 局域网访问
- 电脑: `https://localhost:5173`
- 手机: `https://<电脑局域网IP>:5173` (需在同一 WiFi)
