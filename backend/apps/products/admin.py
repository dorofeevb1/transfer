from django.contrib import admin
from .models import Product, ProductPhoto
from typing import Any, List, Optional, Sequence, Tuple, Type


class ProductPhotoInline(admin.TabularInline):
    """
    Inline admin interface for ProductPhoto.

    This allows managing product photos directly within the Product admin page.
    It is configured to show a thumbnail of the image and is read-only.
    """
    model: Type[ProductPhoto] = ProductPhoto
    extra: int = 0
    readonly_fields: Sequence[str] = ('image_thumbnail',)
    fields: Sequence[str] = ('image_thumbnail', 'image')

    def has_add_permission(self, request: Any, obj: Any = None) -> bool:
        """
        Disables adding photos directly from the admin inline.

        Args:
            request: The current HttpRequest.
            obj: The parent object instance.

        Returns:
            bool: Always False to prevent adding photos here.
        """
        return False


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Product model.

    Configures the list display, search fields, filters, and inlines for
    managing products in the standard Django admin interface.
    """
    list_display: Tuple[str, ...] = ('sku', 'name', 'category_level_1', 'actual_price', 'kp_date')
    search_fields: Tuple[str, ...] = ('sku', 'name', 'composition', 'tn_ved_code')
    list_filter: Tuple[str, ...] = ('category_level_1', 'category_level_2', 'kp_date')
    inlines: List[Type[admin.TabularInline]] = [ProductPhotoInline]
