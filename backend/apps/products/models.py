import os
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils.html import mark_safe
from typing import final, Any


def product_photo_upload_path(instance: 'ProductPhoto', filename: str) -> str:
    """
    Generates the upload path for a product photo.

    Args:
        instance: The ProductPhoto instance being saved.
        filename: The original filename of the uploaded image.

    Returns:
        str: A unique path for the image, structured as 'products/<sku>/<filename>'.
    """
    sku = instance.product.sku or "unknown_sku"
    return os.path.join('products', str(sku), filename)


@final
class Product(models.Model):
    """
    Represents a product in the BrioTradeLogistic system.

    This model stores all the detailed information about a product,
    based on the provided CSV structure.
    """
    kp_date = models.DateField(_("Дата КП"), null=True, blank=True)
    category_level_1 = models.CharField(_("Категория. Уровень 1"), max_length=255, null=True, blank=True)
    category_level_2 = models.CharField(_("Категория. Уровень 2"), max_length=255, null=True, blank=True)
    video_url = models.URLField(_("Видео (ссылка)"), max_length=1024, null=True, blank=True)
    sku = models.CharField(_("Артикул"), max_length=100, unique=True, db_index=True)
    name = models.CharField(_("Наименование товара"), max_length=512)
    composition = models.TextField(_("Состав"), null=True, blank=True)
    product_size = models.CharField(_("Размер товара"), max_length=255, null=True, blank=True)
    packaging = models.CharField(_("Упаковка товара"), max_length=255, null=True, blank=True)
    group_packaging = models.CharField(_("Групповая упаковка"), max_length=255, null=True, blank=True)
    quantum = models.IntegerField(_("Квант"), null=True, blank=True)
    actual_price = models.DecimalField(_("Фактическая цена, ₽"), max_digits=12, decimal_places=2, null=True, blank=True)
    shipping_box_load = models.CharField(_("Загрузка транспортного короба"), max_length=255, null=True, blank=True)
    width_cm = models.DecimalField(_("Width, cm"), max_digits=10, decimal_places=2, null=True, blank=True)
    height_cm = models.DecimalField(_("Height, cm"), max_digits=10, decimal_places=2, null=True, blank=True)
    length_cm = models.DecimalField(_("Length, cm"), max_digits=10, decimal_places=2, null=True, blank=True)
    cbm = models.DecimalField(_("CBM"), max_digits=10, decimal_places=4, null=True, blank=True)
    shipping_box_gross_weight = models.DecimalField(_("Брутто транспортного короба"), max_digits=10, decimal_places=3, null=True, blank=True)
    tn_ved_code = models.CharField(_("ТН ВЭД код"), max_length=100, null=True, blank=True)
    tp = models.TextField(_("ТП"), null=True, blank=True)
    rd = models.TextField(_("РД"), null=True, blank=True)
    risk = models.TextField(_("Риск"), null=True, blank=True)
    vat_rate = models.DecimalField(_("НДС"), max_digits=5, decimal_places=2, null=True, blank=True)
    store_quantity = models.IntegerField(_("Кол-во магазинов"), null=True, blank=True)
    item_quantity = models.IntegerField(_("Кол-во шт"), null=True, blank=True)
    comments = models.TextField(_("Комментарии"), null=True, blank=True)

    class Meta:
        verbose_name = _("Product")
        verbose_name_plural = _("Products")
        ordering = ['-kp_date', 'name']

    def __str__(self) -> str:
        """
        Returns the string representation of the Product.

        Returns:
            str: The name of the product.
        """
        return str(self.name)


@final
class ProductPhoto(models.Model):
    """
    Represents a photo associated with a Product.

    This model links an image file to a specific product, allowing for a
    many-to-one relationship (one product can have multiple photos).
    """
    product = models.ForeignKey(Product, related_name='photos', on_delete=models.CASCADE, verbose_name=_("Product"))
    image = models.ImageField(_("Image"), upload_to=product_photo_upload_path)

    class Meta:
        verbose_name = _("Product Photo")
        verbose_name_plural = _("Product Photos")
        ordering = ['id']

    def __str__(self) -> str:
        """
        Returns a string representation of the ProductPhoto.

        Returns:
            str: A descriptive string including the product name and image filename.
        """
        return f"{self.product.name} - {os.path.basename(self.image.name)}"

    @property
    def image_thumbnail(self) -> Any:
        """
        Generates an HTML image tag for displaying a thumbnail in the admin.

        Returns:
            str: An HTML string for a small image preview, or a placeholder if no image exists.
        """
        if self.image:
            return mark_safe(f'<img src="{self.image.url}" width="100" height="100" style="object-fit: cover;" />')
        return _("No Image")
