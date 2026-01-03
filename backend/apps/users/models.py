from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from .managers import CustomUserManager

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Администратор'
        MANAGER = 'manager', 'Менеджер'
        CLIENT = 'client', 'Клиент'
        MERCHANDISER = 'merchandiser', 'Товаровед'

    class AccessLevel(models.TextChoices):
        VIEW_EDIT = 'view_edit', 'Просмотр и редактирование'
        VIEW_ONLY = 'view_only', 'Только просмотр'

    username = None
    email = models.EmailField(_('email address'), unique=True)
    fio = models.CharField(_('ФИО'), max_length=255, blank=True)
    fio_zh = models.CharField(_('ФИО (CN)'), max_length=255, blank=True)
    role = models.CharField(_('Роль'), max_length=20, choices=Role.choices, default=Role.CLIENT)
    access = models.CharField(_('Доступ'), max_length=20, choices=AccessLevel.choices, default=AccessLevel.VIEW_ONLY)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    class Meta:
        verbose_name = _('Пользователь')
        verbose_name_plural = _('Пользователи')
        ordering = ['id']

    def __str__(self):
        return f"{self.email} ({self.fio})"
