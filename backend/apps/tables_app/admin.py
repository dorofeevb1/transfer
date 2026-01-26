# backend/apps/tables_app/admin.py
from django.contrib import admin
from django.urls import path
from django.http import HttpResponseRedirect
from django.contrib import messages

from .models import Product
from .tasks import fix_translations_task


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    # --- КАСТОМНЫЙ JS ДЛЯ КЛИКА ПО СТРОКЕ ---
    class Media:
        js = ('admin/js/row_click.js',)

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

    # --- ОГРАНИЧЕНИЯ ДЛЯ МЕНЕДЖЕРА ---

    # Сокращенный список колонок для менеджера (в требуемом порядке)
    MANAGER_LIST_DISPLAY = (
        "date_creation",
        "category_1",
        "category_2",
        "photos_list",
        "article",
        "name",
        "composition",
        "size_goods",
        "package_goods",
        "group_package",
        "quantum",
        "price_actual",
        "vat",
        "amount_stores",
        "amount_pieces",
        "comments",
    )

    # Сокращенная форма редактирования для менеджера
    MANAGER_FIELDSETS = (
        (
            "Основное",
            {
                "fields": (
                    "date_creation",
                    ("category_1", "category_1_zh"),
                    ("category_2", "category_2_zh"),
                    "photos_list",
                    "article",
                    ("name", "name_zh"),
                )
            },
        ),
        (
            "Описание",
            {
                "fields": (
                    ("composition", "composition_zh"),
                    "size_goods",
                )
            },
        ),
        (
            "Упаковка и цена",
            {
                "fields": (
                    ("package_goods", "package_goods_zh"),
                    "group_package",
                    "quantum",
                    "price_actual",
                    "vat",
                )
            },
        ),
        (
            "Количество",
            {
                "fields": (
                    "amount_stores",
                    "amount_pieces",
                )
            },
        ),
        (
            "Комментарии",
            {
                "fields": (
                    ("comments", "comments_zh"),
                )
            },
        ),
    )

    def _is_manager(self, request):
        """Проверка, является ли пользователь менеджером."""
        return hasattr(request.user, 'role') and request.user.role == 'manager'

    def get_list_display(self, request):
        """Сокращенный список колонок для менеджера."""
        if self._is_manager(request):
            return self.MANAGER_LIST_DISPLAY
        return self.list_display

    def get_fieldsets(self, request, obj=None):
        """Сокращенная форма редактирования для менеджера."""
        if self._is_manager(request):
            return self.MANAGER_FIELDSETS
        return self.fieldsets

    def get_list_filter(self, request):
        """Скрываем фильтры для менеджера."""
        if self._is_manager(request):
            return ()
        return self.list_filter

    def has_add_permission(self, request):
        """Менеджер не может добавлять товары."""
        if self._is_manager(request):
            return False
        return super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        """Менеджер не может удалять товары."""
        if self._is_manager(request):
            return False
        return super().has_delete_permission(request, obj)
