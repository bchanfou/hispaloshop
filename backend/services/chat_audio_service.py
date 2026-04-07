"""
Chat Audio Service — Gestión de mensajes de audio.

Features:
- Upload de audios a Cloudinary (max 2 minutos)
- Auto-delete de audios antiguos (>30 días)
- Purga agresiva de audios largos (>1min, >7 días)
- Waveform generation (simplified)
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
import cloudinary
import cloudinary.uploader

from core.database import db

logger = logging.getLogger(__name__)

# Límites
MAX_AUDIO_DURATION_SECONDS = 120  # 2 minutos
MAX_AUDIO_SIZE_MB = 10


class ChatAudioService:
    """Servicio para gestionar mensajes de audio."""
    
    async def validate_audio(self, file_size: int, duration: Optional[float] = None) -> tuple[bool, str]:
        """
        Valida un audio antes de subir.
        
        Returns: (is_valid, error_message)
        """
        # Verificar tamaño
        size_mb = file_size / (1024 * 1024)
        if size_mb > MAX_AUDIO_SIZE_MB:
            return False, f"Audio demasiado grande (máx {MAX_AUDIO_SIZE_MB}MB)"
        
        # Verificar duración si se proporciona
        if duration and duration > MAX_AUDIO_DURATION_SECONDS:
            return False, f"Audio demasiado largo (máx {MAX_AUDIO_DURATION_SECONDS // 60} minutos)"
        
        return True, ""
    
    async def upload_audio(
        self,
        audio_data: bytes,
        conversation_id: str,
        sender_id: str,
        duration_seconds: float
    ) -> Dict:
        """
        Sube un audio a Cloudinary y guarda metadata.
        
        Args:
            audio_data: Bytes del archivo de audio
            conversation_id: ID de la conversación
            sender_id: ID del remitente
            duration_seconds: Duración del audio
        
        Returns:
            Dict con: audio_id, url, duration, expires_at
        """
        # Validar
        is_valid, error = await self.validate_audio(len(audio_data), duration_seconds)
        if not is_valid:
            raise ValueError(error)
        
        try:
            # Subir a Cloudinary
            result = cloudinary.uploader.upload(
                audio_data,
                resource_type="video",  # Cloudinary trata audio como video
                folder=f"chat_audio/{conversation_id}",
                format="mp3"
            )
            
            # Calcular fecha de expiración
            expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            
            # Guardar metadata
            audio_doc = {
                "conversation_id": conversation_id,
                "sender_id": sender_id,
                "url": result["secure_url"],
                "public_id": result["public_id"],
                "duration_seconds": duration_seconds,
                "file_size": len(audio_data),
                "created_at": datetime.now(timezone.utc),
                "expires_at": expires_at,
                "is_deleted": False
            }
            
            insert_result = await db.chat_audio.insert_one(audio_doc)
            
            logger.info(
                f"[ChatAudio] Audio subido: {insert_result.inserted_id} "
                f"duración={duration_seconds}s, expira={expires_at}"
            )
            
            return {
                "audio_id": str(insert_result.inserted_id),
                "url": result["secure_url"],
                "duration_seconds": duration_seconds,
                "expires_at": expires_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"[ChatAudio] Error subiendo audio: {e}")
            raise
    
    async def delete_audio(self, audio_id: str):
        """Marca un audio como eliminado (soft delete)."""
        audio = await db.chat_audio.find_one({"_id": audio_id})
        if not audio:
            return
        
        # Marcar como eliminado
        await db.chat_audio.update_one(
            {"_id": audio_id},
            {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc)}}
        )
        
        # Eliminar de Cloudinary (opcional, el cron lo hará después)
        try:
            if audio.get("public_id"):
                cloudinary.uploader.destroy(audio["public_id"], resource_type="video")
        except Exception as e:
            logger.warning(f"[ChatAudio] Error eliminando de Cloudinary: {e}")
    
    async def cleanup_expired_audio(self) -> Dict:
        """
        Limpia audios expirados.
        
        Reglas:
        1. Eliminar audios con >30 días
        2. Eliminar audios >1 minuto con >7 días (purga agresiva)
        
        Returns:
            Dict con estadísticas de limpieza
        """
        now = datetime.now(timezone.utc)
        
        # 1. Audios >30 días
        thirty_days_ago = now - timedelta(days=30)
        expired_old = await db.chat_audio.find({
            "created_at": {"$lt": thirty_days_ago},
            "is_deleted": {"$ne": True}
        }).to_list(length=1000)
        
        # 2. Audios >1 minuto, >7 días
        seven_days_ago = now - timedelta(days=7)
        expired_long = await db.chat_audio.find({
            "duration_seconds": {"$gt": 60},
            "created_at": {"$lt": seven_days_ago},
            "is_deleted": {"$ne": True}
        }).to_list(length=1000)
        
        all_expired = list({a["_id"]: a for a in expired_old + expired_long}.values())
        
        deleted_count = 0
        for audio in all_expired:
            try:
                await self.delete_audio(audio["_id"])
                deleted_count += 1
            except Exception as e:
                logger.error(f"[ChatAudio] Error eliminando audio {audio['_id']}: {e}")
        
        logger.info(f"[ChatAudio] Limpieza completada: {deleted_count} audios eliminados")
        
        return {
            "deleted_count": deleted_count,
            "expired_30d": len(expired_old),
            "expired_long": len(expired_long)
        }
    
    async def get_audio_info(self, audio_id: str) -> Optional[Dict]:
        """Obtiene información de un audio."""
        audio = await db.chat_audio.find_one({
            "_id": audio_id,
            "is_deleted": {"$ne": True}
        })
        
        if not audio:
            return None
        
        return {
            "audio_id": str(audio["_id"]),
            "url": audio["url"],
            "duration_seconds": audio["duration_seconds"],
            "expires_at": audio["expires_at"].isoformat() if audio.get("expires_at") else None,
            "created_at": audio["created_at"].isoformat()
        }


# Singleton
chat_audio_service = ChatAudioService()
