#!/usr/bin/env python3
"""
Script para gestionar administradores de Hispaloshop
"""
import pymongo
from pymongo import MongoClient
import hashlib
import uuid
from datetime import datetime, timezone
import sys

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

def hash_password(password: str) -> str:
    import bcrypt
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_admin(email: str, password: str, name: str, is_super: bool = False):
    """Crear una nueva cuenta de administrador"""
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Verificar si el email ya existe
    existing = db.users.find_one({"email": email})
    if existing:
        print(f"ERROR: El email {email} ya está registrado")
        print(f"   Rol actual: {existing.get('role')}")
        client.close()
        return False
    
    # Crear usuario admin
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    role = "super_admin" if is_super else "admin"
    user_data = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "password_hash": hash_password(password),
        "role": role,
        "email_verified": True,
        "country": "ES",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.users.insert_one(user_data)
    print(f"OK: {'Super Admin' if is_super else 'Admin'} creado exitosamente")
    print(f"   Email: {email}")
    print(f"   Nombre: {name}")
    print(f"   User ID: {user_id}")
    print(f"   Rol: {role}")
    print(f"   Contraseña: {password}")
    
    client.close()
    return True

def delete_admin(email: str):
    """Eliminar cuenta de administrador"""
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Buscar usuario
    user = db.users.find_one({"email": email})
    if not user:
        print(f"ERROR: No se encontró usuario con email {email}")
        client.close()
        return False
    
    if user.get("role") != "admin":
        print(f"ADVERTENCIA: El usuario {email} no es administrador")
        print(f"   Rol actual: {user.get('role')}")
        confirm = input("¿Eliminar de todos modos? (si/no): ")
        if confirm.lower() != "si":
            print("ERROR: Operación cancelada")
            client.close()
            return False
    
    # Proteger el admin principal
    if email == "admin@hispaloshop.com":
        print("ERROR: No se puede eliminar el administrador principal")
        client.close()
        return False
    
    # Eliminar usuario
    result = db.users.delete_one({"email": email})
    
    if result.deleted_count > 0:
        print(f"OK: Usuario {email} eliminado exitosamente")
        # Limpiar sesiones
        db.user_sessions.delete_many({"user_id": user["user_id"]})
        print(f"   Sesiones eliminadas")
    else:
        print(f"ERROR: No se pudo eliminar el usuario")
    
    client.close()
    return True

def list_admins():
    """Listar todos los administradores"""
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    admins = db.users.find({"role": "admin"}, {"_id": 0, "email": 1, "name": 1, "user_id": 1, "created_at": 1})
    
    print("\nLista de Administradores:")
    print("-" * 80)
    
    count = 0
    for admin in admins:
        count += 1
        print(f"\n{count}. {admin.get('name')}")
        print(f"   Email: {admin.get('email')}")
        print(f"   User ID: {admin.get('user_id')}")
        print(f"   Creado: {admin.get('created_at', 'N/A')[:10]}")
    
    if count == 0:
        print("   No se encontraron administradores")
    else:
        print(f"\nTotal: {count} administrador(es)")
    
    client.close()

def promote_to_admin(email: str):
    """Promover un usuario existente a administrador"""
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    user = db.users.find_one({"email": email})
    if not user:
        print(f"ERROR: No se encontró usuario con email {email}")
        client.close()
        return False
    
    if user.get("role") == "admin":
        print(f"INFO: El usuario {email} ya es administrador")
        client.close()
        return True
    
    # Promover a admin
    db.users.update_one(
        {"email": email},
        {"$set": {"role": "admin", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    print(f"OK: Usuario {email} promovido a administrador")
    print(f"   Rol anterior: {user.get('role')}")
    print(f"   Rol nuevo: admin")
    
    client.close()
    return True

# Menú interactivo
if __name__ == "__main__":
    print("=" * 80)
    print("GESTIÓN DE ADMINISTRADORES - HISPALOSHOP")
    print("=" * 80)
    
    while True:
        print("\nOpciones:")
        print("1. Listar administradores")
        print("2. Crear nuevo administrador")
        print("3. Eliminar administrador")
        print("4. Promover usuario a administrador")
        print("5. Salir")
        
        choice = input("\nSelecciona una opción (1-5): ").strip()
        
        if choice == "1":
            list_admins()
        
        elif choice == "2":
            print("\n--- Crear Nuevo Administrador ---")
            email = input("Email: ").strip()
            password = input("Contraseña: ").strip()
            name = input("Nombre: ").strip()
            
            if email and password and name:
                create_admin(email, password, name)
            else:
                print("ERROR: Todos los campos son obligatorios")
        
        elif choice == "3":
            print("\n--- Eliminar Administrador ---")
            email = input("Email del administrador a eliminar: ").strip()
            
            if email:
                delete_admin(email)
            else:
                print("ERROR: Email es obligatorio")
        
        elif choice == "4":
            print("\n--- Promover Usuario a Admin ---")
            email = input("Email del usuario: ").strip()
            
            if email:
                promote_to_admin(email)
            else:
                print("ERROR: Email es obligatorio")
        
        elif choice == "5":
            print("\nHasta luego!")
            break
        
        else:
            print("ERROR: Opción inválida")
