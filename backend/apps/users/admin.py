# backend/apps/users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """
    Настройка админки для кастомной модели пользователя.
    """

    # Поля, которые отображаются в списке пользователей
    list_display = ("email", "fio", "role", "access", "is_active", "is_staff")

    # Поля, по которым можно фильтровать список (справа)
    list_filter = ("role", "access", "is_active", "is_staff")

    # Поля, по которым работает поиск
    search_fields = ("email", "fio")

    # Сортировка по умолчанию
    ordering = ("email",)

    # Настройка формы редактирования пользователя
    # Добавляем наши кастомные поля (Role, Access, FIO) в секцию "Personal info"
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Персональная информация"), {"fields": ("fio", "role", "access")}),
        (
            _("Права доступа"),
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
        (_("Важные даты"), {"fields": ("last_login", "date_joined")}),
    )

    # Настройка формы создания нового пользователя (в админке)
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password",
                    "confirm_password",
                ),  # confirm_password обрабатывается UserAdmin
            },
        ),
        (_("Доп. информация"), {"fields": ("fio", "role", "access")}),
    )
