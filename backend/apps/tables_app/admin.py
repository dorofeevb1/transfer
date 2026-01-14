# backend/apps/tables_app/admin.py
from django.contrib import admin
from django.urls import path
from django.http import HttpResponseRedirect
from django.contrib import messages
from deep_translator import GoogleTranslator
import time

from .models import Product


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
        """Логика исправления переводов прямо из админки."""
        translator = GoogleTranslator(source="auto", target="zh-CN")
        fields_to_fix = {
            "name": "name_zh",
            "category_1": "category_1_zh",
            "category_2": "category_2_zh",
            "composition": "composition_zh",
            "package_goods": "package_goods_zh",
            "tp": "tp_zh",
            "rd": "rd_zh",
            "risk": "risk_zh",
            "comments": "comments_zh",
        }

        # Функция для проверки пустоты (внутренняя для админки)
        def is_blank(v):
            return v is None or str(v).strip() in ["", "—", "-", "nan", "None"]

        products = Product.objects.all()
        fixed_count = 0

        for p in products:
            changed = False
            for ru_f, zh_f in fields_to_fix.items():
                val_ru = getattr(p, ru_f)
                val_zh = getattr(p, zh_f)
                if not is_blank(val_ru) and is_blank(val_zh):
                    try:
                        setattr(p, zh_f, translator.translate(str(val_ru)))
                        changed = True
                        time.sleep(0.1)
                    except Exception:
                        continue
            if changed:
                p.save()
                fixed_count += 1

        self.message_user(
            request,
            f"Успешно исправлено товаров: {fixed_count}",
            messages.SUCCESS,
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
