from __future__ import annotations

import json
import subprocess
import tempfile
from typing import Any, Dict
from uuid import UUID

import cloudinary
import cloudinary.uploader


class VideoService:
    """Procesamiento de video para reels."""

    MAX_DURATION_SECONDS = 90
    MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024
    SUPPORTED_FORMATS = {"mp4", "mov", "avi", "webm"}

    @staticmethod
    async def upload_reel(file_content: bytes, filename: str, user_id: UUID, cover_frame_seconds: float = 1.0) -> Dict[str, Any]:
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if extension not in VideoService.SUPPORTED_FORMATS:
            raise ValueError("Formato de video no soportado")
        if len(file_content) > VideoService.MAX_FILE_SIZE_BYTES:
            raise ValueError("Video demasiado pesado (máximo 100MB)")

        duration = await VideoService._extract_duration(file_content)
        if duration > VideoService.MAX_DURATION_SECONDS:
            raise ValueError(f"Video demasiado largo: {duration:.2f}s")

        result = cloudinary.uploader.upload(
            file_content,
            resource_type="video",
            folder=f"hispaloshop/reels/{user_id}",
            eager=[
                {"width": 480, "height": 854, "crop": "fill", "video_codec": "h264", "audio_codec": "aac", "quality": "auto:good"},
                {"width": 720, "height": 1280, "crop": "fill", "video_codec": "h264", "audio_codec": "aac", "quality": "auto:good"},
                {
                    "width": 720,
                    "height": 1280,
                    "crop": "fill",
                    "start_offset": max(0.0, cover_frame_seconds),
                    "format": "jpg",
                    "resource_type": "video",
                },
            ],
            eager_async=False,
        )

        eager = result.get("eager", [])
        if len(eager) < 3:
            raise ValueError("No se pudieron generar transformaciones de video")

        return {
            "video_url": result["secure_url"],
            "duration": duration,
            "thumbnail_url": eager[2]["secure_url"],
            "public_id": result["public_id"],
            "formats": {
                "480p": eager[0]["secure_url"],
                "720p": eager[1]["secure_url"],
            },
        }

    @staticmethod
    async def _extract_duration(file_content: bytes) -> float:
        try:
            with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp:
                tmp.write(file_content)
                tmp.flush()
                output = subprocess.check_output(
                    [
                        "ffprobe",
                        "-v",
                        "quiet",
                        "-print_format",
                        "json",
                        "-show_format",
                        tmp.name,
                    ]
                )
                data = json.loads(output.decode("utf-8"))
                duration = (data.get("format") or {}).get("duration")
                return float(duration or 0.0)
        except Exception:
            return 0.0

    @staticmethod
    async def generate_thumbnail_at_time(video_url: str, seconds: float) -> str:
        return cloudinary.CloudinaryVideo(video_url).build_url(
            resource_type="video",
            start_offset=max(0.0, seconds),
            width=720,
            height=1280,
            crop="fill",
            format="jpg",
            secure=True,
        )
