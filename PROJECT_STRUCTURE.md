# 项目结构

```
test6/
├── docs/                          # 项目文档
│   ├── requirement.md             # 需求文档
│   ├── design.md                  # 设计文档
│   └── task.md                    # 任务进度
├── public/                        # 静态资源
│   └── mediapipe/                 # MediaPipe 模型文件 (本地备份)
│       ├── hands.js
│       ├── hand_landmark_*.tflite # AI 模型权重
│       └── hands_solution_*.wasm  # WebAssembly 运行时
├── docs_index.md                  # 文档索引
├── index.html                     # 入口 HTML
├── main.js                        # 主逻辑脚本
├── style.css                      # 样式文件
├── vite.config.js                 # Vite 配置 (HTTPS + 局域网)
├── package.json                   # 项目依赖
├── package-lock.json              # 依赖版本锁定
└── PROJECT_STRUCTURE.md           # 本文件
```
