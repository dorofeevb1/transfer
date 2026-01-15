# backend/apps/tables_app/admin.py
from django.contrib import admin
from django.urls import path
from django.http import HttpResponseRedirect
from django.contrib import messages

from .models import Product
from .tasks import fix_translations_task


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    # --- НАСТРОЙКИ ОТОБРАЖЕНИЯ ---
    list_display = (
        "article",
        "name",
        "category_1",
        "price_actual",
        "amount_pieces",
        "date_creation",
    )
    list_display_links = ("article", "name")
    list_filter = ("date_creation", "category_1")
    search_fields = ("article", "name", "name_zh")
    list_per_page = 50

    # --- КНОПКА ПЕРЕВОДА В АДМИНКЕ ---

    def get_urls(self):
        """Добавляем кастомный URL для обработки нажатия кнопки."""
        urls = super().get_urls()
        custom_urls = [
            path(
                "fix-translations/",
                self.admin_site.admin_view(self.fix_translations_view),
                name="fix_translations",
            ),
        ]
        return custom_urls + urls

    def fix_translations_view(self, request):
        """Запуск фоновой задачи перевода через Celery."""
        fix_translations_task.delay()
        self.message_user(
            request,
            "Задача перевода запущена в фоне. Это может занять несколько минут.",
            messages.INFO,
        )
        return HttpResponseRedirect("../")

    # --- ГРУППИРОВКА ПОЛЕЙ ---
    fieldsets = (
        (
            "Основное",
            {
                "fields": (
                    "article",
                    "date_creation",
                    "name",
                    "name_zh",
                    "price_actual",
                    "amount_pieces",
                    "amount_stores",
                )
            },
        ),
        (
            "Категории",
            {
                "fields": (
                    ("category_1", "category_1_zh"),
                    ("category_2", "category_2_zh"),
                )
            },
        ),
        (
            "Характеристики",
            {
                "fields": (
                    ("composition", "composition_zh"),
                    "size_goods",
                    "quantum",
                )
            },
        ),
        (
            "Логистика",
            {
                "fields": (
                    ("package_goods", "package_goods_zh"),
                    "group_package",
                    "transport_box_load",
                    "gross_weight",
                    ("width_cm", "height_cm", "length_cm", "cbm"),
                )
            },
        ),
        (
            "ВЭД",
            {
                "fields": (
                    "tn_ved_code",
                    "vat",
                    ("tp", "tp_zh"),
                    ("rd", "rd_zh"),
                    ("risk", "risk_zh"),
                )
            },
        ),
        (
            "Медиа",
            {
                "classes": ("collapse",),
                "fields": (
                    "photos_list",
                    "video_link",
                    ("comments", "comments_zh"),
                    "extra_data",
                ),
            },
        ),
    )
