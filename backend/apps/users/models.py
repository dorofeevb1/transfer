from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from typing import final


@final
class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.

    Adds a 'role' field to distinguish between different types of users
    within the system, such as 'admin' and 'user', aligning with the
    frontend's authentication logic.
    """

    class Role(models.TextChoices):
        """
        Enumeration for user roles.
        """
        ADMIN = "admin", _("Admin")
        USER = "user", _("User")

    role: models.CharField = models.CharField(
        _("Role"),
        max_length=20,
        choices=Role.choices,
        default=Role.USER,
        help_text=_("The role of the user within the system."),
    )

    class Meta:
        """
        Meta options for the User model.
        """
        verbose_name: str = _("User")
        verbose_name_plural: str = _("Users")

    def __str__(self) -> str:
        """
        Returns the string representation of the User.

        Returns:
            str: The username of the user.
        """
        return str(self.username)
