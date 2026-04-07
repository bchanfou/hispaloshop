"""
Chat Groups Service — Gestión de grupos de chat.

Features:
- Grupos privados (max 20 miembros)
- Grupos de comunidad (max 500, opt-in)
- Admin roles y permisos
- Invite system
"""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional, Literal
from bson import ObjectId

from core.database import db

logger = logging.getLogger(__name__)

ChatGroupType = Literal["private", "community"]


class ChatGroupsService:
    """Servicio para gestionar grupos de chat."""
    
    # Límites
    MAX_PRIVATE_MEMBERS = 20
    MAX_COMMUNITY_MEMBERS = 500
    
    async def create_private_group(
        self,
        creator_id: str,
        name: str,
        member_ids: List[str],
        avatar_url: Optional[str] = None
    ) -> Dict:
        """
        Crea un grupo privado.
        
        Args:
            creator_id: ID del creador (será admin)
            name: Nombre del grupo
            member_ids: IDs de miembros iniciales (sin incluir creador)
            avatar_url: URL del avatar opcional
        
        Returns:
            Dict con group info
        """
        # Validar límites
        total_members = len(member_ids) + 1  # +1 por el creador
        if total_members > self.MAX_PRIVATE_MEMBERS:
            raise ValueError(f"Máximo {self.MAX_PRIVATE_MEMBERS} miembros en grupos privados")
        
        if len(name.strip()) < 3:
            raise ValueError("El nombre debe tener al menos 3 caracteres")
        
        # Crear grupo
        group = {
            "_id": str(ObjectId()),
            "type": "private",
            "name": name.strip(),
            "avatar_url": avatar_url,
            "creator_id": creator_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "members": [
                {
                    "user_id": creator_id,
                    "role": "admin",  # Creador es admin
                    "joined_at": datetime.now(timezone.utc)
                }
            ],
            "settings": {
                "only_admins_can_add": True,
                "only_admins_can_remove": True,
                "allow_member_messages": True
            },
            "is_active": True
        }
        
        # Añadir miembros
        for member_id in member_ids:
            if member_id != creator_id:
                group["members"].append({
                    "user_id": member_id,
                    "role": "member",
                    "joined_at": datetime.now(timezone.utc)
                })
        
        await db.chat_groups.insert_one(group)
        
        # Crear conversación asociada
        conversation = {
            "_id": str(ObjectId()),
            "type": "group",
            "group_id": group["_id"],
            "participants": [m["user_id"] for m in group["members"]],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.conversations.insert_one(conversation)
        
        logger.info(f"[ChatGroups] Grupo privado creado: {group['_id']} por {creator_id}")
        
        return {
            "group_id": group["_id"],
            "type": "private",
            "name": group["name"],
            "member_count": len(group["members"]),
            "conversation_id": conversation["_id"]
        }
    
    async def create_community_group(
        self,
        community_id: str,
        name: str,
        admin_id: str
    ) -> Dict:
        """
        Crea un grupo asociado a una comunidad.
        
        Args:
            community_id: ID de la comunidad
            name: Nombre del grupo
            admin_id: ID del admin inicial (owner de la comunidad)
        
        Returns:
            Dict con group info
        """
        # Verificar que la comunidad existe
        community = await db.communities.find_one({"_id": community_id})
        if not community:
            raise ValueError("Comunidad no encontrada")
        
        group = {
            "_id": str(ObjectId()),
            "type": "community",
            "community_id": community_id,
            "name": name,
            "avatar_url": community.get("avatar_url"),
            "creator_id": admin_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "members": [
                {
                    "user_id": admin_id,
                    "role": "admin",
                    "joined_at": datetime.now(timezone.utc),
                    "is_opted_in": True
                }
            ],
            "settings": {
                "max_members": self.MAX_COMMUNITY_MEMBERS,
                "require_opt_in": True  # Miembros deben opt-in explícitamente
            },
            "is_active": True
        }
        
        await db.chat_groups.insert_one(group)
        
        # Actualizar comunidad con referencia al grupo
        await db.communities.update_one(
            {"_id": community_id},
            {"$set": {"chat_group_id": group["_id"]}}
        )
        
        logger.info(f"[ChatGroups] Grupo de comunidad creado: {group['_id']} para comunidad {community_id}")
        
        return {
            "group_id": group["_id"],
            "type": "community",
            "name": group["name"],
            "community_id": community_id
        }
    
    async def join_community_group(
        self,
        group_id: str,
        user_id: str
    ) -> bool:
        """
        Usuario se une a un grupo de comunidad (opt-in).
        
        Returns:
            True si se unió, False si ya estaba
        """
        group = await db.chat_groups.find_one({
            "_id": group_id,
            "type": "community"
        })
        
        if not group:
            raise ValueError("Grupo no encontrado")
        
        # Verificar si ya es miembro
        existing = next((m for m in group["members"] if m["user_id"] == user_id), None)
        if existing:
            return False
        
        # Verificar límite
        if len(group["members"]) >= self.MAX_COMMUNITY_MEMBERS:
            raise ValueError("Grupo lleno")
        
        # Añadir miembro
        await db.chat_groups.update_one(
            {"_id": group_id},
            {
                "$push": {
                    "members": {
                        "user_id": user_id,
                        "role": "member",
                        "joined_at": datetime.now(timezone.utc),
                        "is_opted_in": True
                    }
                }
            }
        )
        
        # Añadir a conversación
        await db.conversations.update_one(
            {"group_id": group_id},
            {"$addToSet": {"participants": user_id}}
        )
        
        return True
    
    async def leave_group(self, group_id: str, user_id: str) -> bool:
        """Usuario abandona un grupo."""
        group = await db.chat_groups.find_one({"_id": group_id})
        if not group:
            raise ValueError("Grupo no encontrado")
        
        # Verificar si es el último admin
        member = next((m for m in group["members"] if m["user_id"] == user_id), None)
        if not member:
            return False
        
        admins = [m for m in group["members"] if m["role"] == "admin"]
        if member["role"] == "admin" and len(admins) == 1:
            # Es el último admin, designar nuevo admin o cerrar grupo
            other_members = [m for m in group["members"] if m["user_id"] != user_id]
            if other_members:
                # Designar el miembro más antiguo como nuevo admin
                oldest = min(other_members, key=lambda m: m["joined_at"])
                await db.chat_groups.update_one(
                    {"_id": group_id, "members.user_id": oldest["user_id"]},
                    {"$set": {"members.$.role": "admin"}}
                )
        
        # Remover del grupo
        await db.chat_groups.update_one(
            {"_id": group_id},
            {"$pull": {"members": {"user_id": user_id}}}
        )
        
        # Remover de conversación
        await db.conversations.update_one(
            {"group_id": group_id},
            {"$pull": {"participants": user_id}}
        )
        
        return True
    
    async def add_member_to_private_group(
        self,
        group_id: str,
        admin_id: str,
        new_member_id: str
    ) -> bool:
        """
        Admin añade miembro a grupo privado.
        
        Returns:
            True si se añadió
        """
        group = await db.chat_groups.find_one({
            "_id": group_id,
            "type": "private"
        })
        
        if not group:
            raise ValueError("Grupo no encontrado")
        
        # Verificar que el solicitante es admin
        requester = next((m for m in group["members"] if m["user_id"] == admin_id), None)
        if not requester or requester["role"] != "admin":
            raise ValueError("Solo los admins pueden añadir miembros")
        
        # Verificar límite
        if len(group["members"]) >= self.MAX_PRIVATE_MEMBERS:
            raise ValueError(f"Máximo {self.MAX_PRIVATE_MEMBERS} miembros")
        
        # Verificar si ya es miembro
        existing = next((m for m in group["members"] if m["user_id"] == new_member_id), None)
        if existing:
            return False
        
        # Añadir
        await db.chat_groups.update_one(
            {"_id": group_id},
            {
                "$push": {
                    "members": {
                        "user_id": new_member_id,
                        "role": "member",
                        "joined_at": datetime.now(timezone.utc)
                    }
                }
            }
        )
        
        await db.conversations.update_one(
            {"group_id": group_id},
            {"$addToSet": {"participants": new_member_id}}
        )
        
        return True
    
    async def get_group_info(self, group_id: str) -> Optional[Dict]:
        """Obtiene información de un grupo."""
        group = await db.chat_groups.find_one({
            "_id": group_id,
            "is_active": True
        })
        
        if not group:
            return None
        
        # Enriquecer con info de usuarios
        member_ids = [m["user_id"] for m in group["members"]]
        users = await db.users.find(
            {"_id": {"$in": member_ids}}
        ).to_list(length=len(member_ids))
        
        user_map = {u["_id"]: u for u in users}
        
        members_enriched = []
        for m in group["members"]:
            user = user_map.get(m["user_id"], {})
            members_enriched.append({
                "user_id": m["user_id"],
                "role": m["role"],
                "joined_at": m["joined_at"].isoformat() if m.get("joined_at") else None,
                "name": user.get("name") or user.get("username"),
                "avatar": user.get("profile_image") or user.get("avatar_url"),
                "is_opted_in": m.get("is_opted_in", True)
            })
        
        return {
            "group_id": group["_id"],
            "type": group["type"],
            "name": group["name"],
            "avatar_url": group.get("avatar_url"),
            "creator_id": group["creator_id"],
            "created_at": group["created_at"].isoformat(),
            "member_count": len(group["members"]),
            "members": members_enriched,
            "settings": group.get("settings", {}),
            "community_id": group.get("community_id")
        }
    
    async def get_user_groups(self, user_id: str) -> List[Dict]:
        """Obtiene todos los grupos de un usuario."""
        groups = await db.chat_groups.find({
            "members.user_id": user_id,
            "is_active": True
        }).sort("updated_at", -1).to_list(length=100)
        
        result = []
        for g in groups:
            # Contar miembros no leídos (simplificado)
            result.append({
                "group_id": g["_id"],
                "type": g["type"],
                "name": g["name"],
                "avatar_url": g.get("avatar_url"),
                "member_count": len(g["members"]),
                "is_community": g["type"] == "community"
            })
        
        return result


# Singleton
chat_groups_service = ChatGroupsService()
