from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User
from typing import Optional, Tuple


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin configuration for the custom User model.

    Inherits from Django's BaseUserAdmin to provide a rich admin interface
    for user management using the standard Django admin.
    """
    fieldsets: Optional[Tuple] = (
        (None, {"fields": ("username", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "email", "role")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    list_display: Tuple[str, ...] = ("username", "email", "first_name", "last_name", "is_staff", "role")
    list_filter: Tuple[str, ...] = ("is_staff", "is_superuser", "is_active", "groups", "role")
