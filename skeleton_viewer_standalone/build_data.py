#!/usr/bin/env python3
"""
build_data.py — 从 pose_3d_yoc44.npy 生成 skeleton_data.json 供 viewer 使用

Usage:
    python build_data.py                           # 扫描默认 results 目录
    python build_data.py /path/to/results_dir      # 指定 results 目录
    python build_data.py --video-config /path/to/video_config.json  # 指定配置

数据源目录结构:
    results_dir/
      ├── 2026-02-03_18-24-45/
      │   └── T01/
      │       ├── pose_3d_yoc44.npy   (N, 44, 3)  ← 必须
      │       ├── metadata.json        {fps, ...}  ← 可选
      │       └── config.json          {impact_frame, ...} ← 可选
      ├── 2026-02-03_20-06-53/
      │   ├── T02/ ...
      │   └── T03/ ...

输出:
    skeleton_data.json  (与本脚本同目录)
"""

import json
import sys
from pathlib import Path

import numpy as np


def find_all_videos(results_dir: Path) -> dict:
    """扫描所有 batch 子目录，找到所有含 pose_3d_yoc44.npy 的视频。"""
    videos = {}
    for batch_dir in sorted(results_dir.iterdir()):
        if not batch_dir.is_dir():
            continue
        for video_dir in sorted(batch_dir.iterdir()):
            if not video_dir.is_dir():
                continue
            pose_path = video_dir / "pose_3d_yoc44.npy"
            if pose_path.exists() and video_dir.name not in videos:
                videos[video_dir.name] = video_dir
    return videos


def load_video(video_dir: Path, video_config: dict = None) -> dict:
    """从一个视频目录加载数据，返回 viewer 所需的 JSON 对象。"""
    stem = video_dir.name

    # pose_3d
    pose_3d = np.load(video_dir / "pose_3d_yoc44.npy")
    if pose_3d.ndim == 4:
        pose_3d = pose_3d.squeeze(0)
    num_frames = pose_3d.shape[0]

    # fps
    fps = 30.0
    meta_path = video_dir / "metadata.json"
    if meta_path.exists():
        with open(meta_path) as f:
            fps = json.load(f).get("fps", 30.0)

    # impact_frame
    impact_frame = 0
    cfg_path = video_dir / "config.json"
    if cfg_path.exists():
        with open(cfg_path) as f:
            impact_frame = json.load(f).get("impact_frame", 0) or 0

    # 兜底: 从 video_config.json 读取
    if impact_frame == 0 and video_config:
        vc = video_config.get("videos", {}).get(f"{stem}.mp4", {})
        impact_frame = vc.get("impact_frame", 0) or 0

    return {
        "frames": num_frames,
        "fps": fps,
        "impact_frame": int(impact_frame),
        "pose_3d": pose_3d.tolist(),
    }


def main():
    # 默认路径
    script_dir = Path(__file__).parent.resolve()
    default_results = script_dir.parent / "data" / "results"
    default_video_cfg = script_dir.parent.parent / "videos" / "video_config.json"

    results_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else default_results

    # 加载 video_config (可选)
    video_config = None
    vc_path = default_video_cfg
    for i, arg in enumerate(sys.argv):
        if arg == "--video-config" and i + 1 < len(sys.argv):
            vc_path = Path(sys.argv[i + 1])
    if vc_path.exists():
        with open(vc_path, encoding="utf-8") as f:
            video_config = json.load(f)

    if not results_dir.exists():
        print(f"Results dir not found: {results_dir}")
        sys.exit(1)

    videos = find_all_videos(results_dir)
    print(f"Found {len(videos)} videos: {', '.join(sorted(videos.keys()))}")

    merged = {}
    for stem in sorted(videos.keys()):
        data = load_video(videos[stem], video_config)
        merged[stem] = data
        print(f"  {stem}: {data['frames']} frames, impact={data['impact_frame']}")

    out_path = script_dir / "skeleton_data.json"
    with open(out_path, "w") as f:
        json.dump(merged, f)

    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"\nSaved: {out_path} ({size_mb:.1f} MB, {len(merged)} videos)")


if __name__ == "__main__":
    main()
