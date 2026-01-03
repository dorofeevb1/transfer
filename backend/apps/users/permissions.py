# backend/apps/users/permissions.py
from rest_framework import permissions


class IsAdminRole(permissions.BasePermission):
    """Разрешает доступ только пользователям с ролью 'admin'."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsAdminOrManager(permissions.BasePermission):
    """Разрешает доступ администраторам и менеджерам."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ["admin", "manager"]


class IsOwnerOrAdmin(permissions.BasePermission):
    """Разрешает редактирование только владельцу профиля или админу."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        return obj == request.user
