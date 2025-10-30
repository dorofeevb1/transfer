from django.apps import AppConfig


class ProductsConfig(AppConfig):
    """
    AppConfig for the 'products' application.

    This class defines the configuration for the products application,
    setting the default auto field and the application name.
    """
    default_auto_field: str = 'django.db.models.BigAutoField'
    name: str = 'apps.products'
