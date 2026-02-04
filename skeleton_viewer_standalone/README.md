# Skeleton Viewer (Standalone)

3D 骨架可视化工具，基于 Three.js，支持 27 个网球正手击球视频的 YOC44 (44关节) 骨架数据。

## 快速启动

```bash
python serve.py
```

浏览器自动打开 `http://localhost:8888`，即可查看。

## 文件结构

```
skeleton_viewer_standalone/
├── index.html          # 3D 骨架 Viewer (Three.js, 单文件)
├── skeleton_data.json  # 所有视频的 pose_3d 数据 (27个视频, ~7.7MB)
├── build_data.py       # 从 pose_3d_yoc44.npy 生成 skeleton_data.json
├── serve.py            # 本地 HTTP 服务器
└── README.md
```

## 数据格式

`skeleton_data.json` 结构：

```json
{
  "T01": {
    "frames": 117,
    "fps": 30.0,
    "impact_frame": 42,
    "pose_3d": [[[x, y, z], ...44个关节], ...N帧]
  },
  "T06": { ... },
  ...
}
```

- `pose_3d`: shape `(N, 44, 3)`，YOC44 格式的 3D 关节坐标
- `impact_frame`: 击球帧序号
- `frames`: 总帧数
- `fps`: 帧率

## 重新生成数据

如果有新的 pose_3d_yoc44.npy 文件，运行：

```bash
python build_data.py                          # 使用默认路径 ../data/results/
python build_data.py /path/to/results_dir     # 指定数据目录
```

数据源目录结构要求：

```
results_dir/
  └── {batch_timestamp}/
      └── {video_name}/
          ├── pose_3d_yoc44.npy    ← 必须 (N, 44, 3)
          ├── metadata.json         ← 可选 {fps, width, height, num_frames}
          └── config.json           ← 可选 {impact_frame, video_name}
```

## Viewer 功能

- **视频切换**: 顶部下拉菜单选择视频 (T01-T31)
- **信息显示**: 视频名称、选手身份、水平等级 (badge 颜色标识)
- **播放控制**: Play/Pause、帧滑块、方向键逐帧
- **相机预设**: 右前45° / 俯视图 / 正面 / 侧面 (平滑过渡)
- **手腕轨迹**: 击球前后 ±20 帧的右手腕挥拍轨迹 (金色)
- **键盘快捷键**: Space=播放/暂停, ←→=逐帧

## 依赖

- 前端: 无需安装，Three.js 通过 CDN 加载
- 数据生成: Python 3 + numpy
