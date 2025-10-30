from django.apps import AppConfig


class UsersConfig(AppConfig):
    """
    AppConfig for the 'users' application.

    This class defines the configuration for the users application,
    setting the default auto field and the application name.
    """
    default_auto_field: str = 'django.db.models.BigAutoField'
    name: str = 'apps.users'
