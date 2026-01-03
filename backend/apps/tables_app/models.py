from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.contrib.postgres.indexes import GinIndex


class Product(models.Model):
    """Модель товара с оптимизированной GIN-индексацией для быстрого глобального поиска."""

    # --- Идентификаторы ---
    article = models.CharField(_("Артикул"), max_length=100, unique=True, db_index=True)

    # --- Дата и Категории ---
    date_creation = models.DateField(_("Дата КП"), default=timezone.now)
    category_1 = models.CharField(_("Категория Ур.1"), max_length=255, blank=True)
    category_1_zh = models.CharField(
        _("Категория Ур.1 (CN)"), max_length=255, blank=True
    )
    category_2 = models.CharField(_("Категория Ур.2"), max_length=255, blank=True)
    category_2_zh = models.CharField(
        _("Категория Ур.2 (CN)"), max_length=255, blank=True
    )

    # --- Описание ---
    name = models.CharField(_("Наименование товара"), max_length=500)
    name_zh = models.CharField(
        _("Наименование товара (CN)"), max_length=500, blank=True
    )
    composition = models.TextField(_("Состав"), blank=True)
    composition_zh = models.TextField(_("Состав (CN)"), blank=True)

    # --- Медиа ---
    photos_list = models.JSONField(_("Список фото"), default=list, blank=True)
    video_link = models.URLField(_("Видео (ссылка)"), max_length=500, blank=True)

    # --- Параметры ---
    size_goods = models.CharField(_("Размер товара"), max_length=255, blank=True)
    package_goods = models.CharField(_("Упаковка товара"), max_length=255, blank=True)
    package_goods_zh = models.CharField(
        _("Упаковка товара (CN)"), max_length=255, blank=True
    )
    group_package = models.CharField(
        _("Групповая упаковка"), max_length=255, blank=True
    )
    quantum = models.IntegerField(_("Квант"), default=0)

    # --- Логистика и Цена ---
    price_actual = models.DecimalField(
        _("Фактическая цена, ₽"), max_digits=12, decimal_places=2, default=0
    )
    transport_box_load = models.CharField(
        _("Загрузка транспортного короба"), max_length=255, blank=True
    )
    width_cm = models.FloatField(_("Width, cm"), default=0)
    height_cm = models.FloatField(_("Height, cm"), default=0)
    length_cm = models.FloatField(_("Length, cm"), default=0)
    cbm = models.FloatField(_("CBM"), default=0)
    gross_weight = models.FloatField(_("Брутто трансп. короба"), default=0)

    # --- ВЭД и Риски ---
    tn_ved_code = models.CharField(_("ТН ВЭД код"), max_length=50, blank=True)
    tp = models.CharField(_("ТП"), max_length=100, blank=True)
    tp_zh = models.CharField(_("ТП (CN)"), max_length=100, blank=True)
    rd = models.CharField(_("РД"), max_length=100, blank=True)
    rd_zh = models.CharField(_("РД (CN)"), max_length=100, blank=True)
    risk = models.CharField(_("Риск"), max_length=100, blank=True)
    risk_zh = models.CharField(_("Риск (CN)"), max_length=100, blank=True)
    vat = models.CharField(_("НДС"), max_length=20, default="20%")

    # --- Склад ---
    amount_stores = models.IntegerField(_("Кол-во магазинов"), default=0)
    amount_pieces = models.IntegerField(_("Кол-во шт"), default=0)

    # --- Комментарии ---
    comments = models.TextField(_("Комментарии"), blank=True)
    comments_zh = models.TextField(_("Комментарии (CN)"), blank=True)

    extra_data = models.JSONField(_("Доп. поля"), default=dict, blank=True)

    class Meta:
        verbose_name = "Товар"
        verbose_name_plural = "Товары"
        ordering = ["-id"]

        # GIN ИНДЕКСЫ: Ускоряют поиск по подстроке icontains в десятки раз.
        # Используем префикс 'gin_trgm_ops' для текстовых полей.
        indexes = [
            GinIndex(
                fields=["article"], name="idx_art_gin", opclasses=["gin_trgm_ops"]
            ),
            GinIndex(fields=["name"], name="idx_name_gin", opclasses=["gin_trgm_ops"]),
            GinIndex(
                fields=["name_zh"], name="idx_name_zh_gin", opclasses=["gin_trgm_ops"]
            ),
            GinIndex(
                fields=["category_1"], name="idx_c1_gin", opclasses=["gin_trgm_ops"]
            ),
            GinIndex(
                fields=["category_2"], name="idx_c2_gin", opclasses=["gin_trgm_ops"]
            ),
            GinIndex(
                fields=["composition"], name="idx_comp_gin", opclasses=["gin_trgm_ops"]
            ),
            GinIndex(fields=["tp"], name="idx_tp_gin", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["rd"], name="idx_rd_gin", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["risk"], name="idx_risk_gin", opclasses=["gin_trgm_ops"]),
        ]

    def __str__(self):
        return f"{self.article} - {self.name}"
