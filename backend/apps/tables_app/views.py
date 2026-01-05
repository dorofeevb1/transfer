# backend/apps/tables_app/views.py
import os
import uuid
import time
import pandas as pd
from datetime import datetime, date
from django.http import HttpResponse
from django.db.models import Q, F, CharField
from django.db.models.functions import Cast
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from deep_translator import GoogleTranslator
import base64

from .models import Product
from .serializers import ProductSerializer, ProductImportSerializer
from .pagination import CustomPageNumberPagination

# --- КОНФИГУРАЦИЯ МАППИНГА (Синхронизировано с models.py) ---

EXCEL_TO_MODEL_MAP = {
    "Дата КП": "date_creation",
    "Категория. Уровень 1": "category_1",
    "Категория. Уровень 2": "category_2",
    "Фотки": "photos_list",
    "photos": "photos_list",  # Поле из фронтенда с base64 картинками
    "Видео (ссылка)": "video_link",
    "Артикул": "article",
    "Наименование товара": "name",
    "Состав": "composition",
    "Размер товара": "size_goods",
    "Упаковка товара": "package_goods",
    "Групповая упаковка": "group_package",
    "Квант": "quantum",
    "Фактическая цена, ₽": "price_actual",
    "Загрузка транспортного короба": "transport_box_load",
    "Width, cm": "width_cm",
    "Height, cm": "height_cm",
    "Length, cm": "length_cm",
    "CBM": "cbm",
    "Брутто транспортного короба": "gross_weight",
    "ТН ВЭД код": "tn_ved_code",
    "ТП": "tp",
    "РД": "rd",
    "Риск": "risk",
    "НДС": "vat",
    "Кол-во магазинов": "amount_stores",
    "Кол-во шт": "amount_pieces",
    "Комментарии": "comments",
}

MODEL_TO_EXCEL_MAP = {v: k for k, v in EXCEL_TO_MODEL_MAP.items()}

# --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---


def decode_base64_file(base64_string):
    """Декодирует Base64 в ContentFile для Django."""
    if not isinstance(base64_string, str):
        return None
    if ";base64," in base64_string:
        _, base64_string = base64_string.split(";base64,")
    try:
        return ContentFile(base64.b64decode(base64_string))
    except:
        return None


def clean_key(key):
    """Очистка заголовков Excel от лишних символов и переносов строк.

    Args:
        key (any): Исходный заголовок из Excel.

    Returns:
        str: Очищенная строка заголовка.
    """
    if not isinstance(key, str):
        return str(key)
    return key.replace("\n", " ").replace("\r", "").strip()


def is_empty(val):
    """Проверка значения на реальную пустоту.

    Считает пустыми значения: None, NaN, пустые строки и технические прочерки.

    Args:
        val (any): Значение для проверки.

    Returns:
        bool: True если значение пустое.
    """
    # Если это список - проверяем, пустой ли он
    if isinstance(val, list):
        return len(val) == 0
    if val is None:
        return True
    # pd.isna не работает с массивами, проверяем только скаляры
    try:
        if pd.isna(val):
            return True
    except (ValueError, TypeError):
        pass
    s_val = str(val).strip().lower()
    return s_val in ["", "—", "-", "none", "nan", "null", "."]


def save_base64_image(base64_str):
    """Сохраняет base64 изображение в файл и возвращает путь."""
    if not base64_str or not isinstance(base64_str, str):
        return None

    # Проверяем формат data:image/...;base64,...
    if not base64_str.startswith("data:image"):
        return None

    try:
        # Извлекаем тип и данные
        header, data = base64_str.split(";base64,", 1)
        ext = header.split("/")[-1]  # png, jpeg, etc
        if ext == "jpeg":
            ext = "jpg"

        # Декодируем и сохраняем
        file_content = ContentFile(base64.b64decode(data))
        filename = f"{uuid.uuid4().hex}.{ext}"
        path = default_storage.save(f"products/{filename}", file_content)
        return f"/media/{path}"
    except Exception:
        return None


def clean_val(val, field_type, field_name=None):
    """Преобразование данных из Excel в типы данных Django.

    Args:
        val (any): Значение из ячейки.
        field_type (str): Внутренний тип поля модели.
        field_name (str): Имя поля (для специальной обработки photos_list).

    Returns:
        any: Типизированное значение.
    """
    # Специальная обработка для photos_list - всегда возвращаем массив
    if field_name == "photos_list":
        if is_empty(val):
            return []

        # Если уже список - обрабатываем каждый элемент
        if isinstance(val, list):
            result = []
            for item in val:
                if not item:
                    continue
                item_str = str(item).strip()
                # Если это base64 - сохраняем как файл
                if item_str.startswith("data:image"):
                    saved_path = save_base64_image(item_str)
                    if saved_path:
                        result.append(saved_path)
                # Если это URL или путь - добавляем как есть
                elif item_str:
                    result.append(item_str)
            return result

        # Если строка - конвертируем в массив
        str_val = str(val).strip()
        if not str_val:
            return []

        # Если это base64 - сохраняем как файл
        if str_val.startswith("data:image"):
            saved_path = save_base64_image(str_val)
            return [saved_path] if saved_path else []

        # Разделяем по запятой или переносу строки (если несколько ссылок)
        photos = [p.strip() for p in str_val.replace('\n', ',').split(',') if p.strip()]
        return photos

    if is_empty(val):
        if field_type in ["int", "float", "DecimalField", "IntegerField", "FloatField"]:
            return 0
        if field_type == "JSONField":
            return []
        return ""

    str_val = str(val).strip()

    if field_type in ["int", "IntegerField"]:
        try:
            return int(float(str_val.replace(" ", "").replace(",", ".")))
        except (ValueError, TypeError):
            return 0

    if field_type in ["float", "DecimalField", "FloatField"]:
        try:
            return float(str_val.replace(" ", "").replace(",", "."))
        except (ValueError, TypeError):
            return 0.0

    if field_type == "DateField":
        if isinstance(val, (datetime, pd.Timestamp)):
            return val.date()
        try:
            return datetime.strptime(str_val, "%d.%m.%Y").date()
        except (ValueError, TypeError):
            return timezone.now().date()

    return str_val


class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet для управления таблицей товаров BRIO-TRADE.

    Обеспечивает CRUD, умный импорт с автопереводом всех текстовых полей,
    глобальный поиск (GET/POST), прозрачную локализацию и экспорт.
    """

    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    pagination_class = CustomPageNumberPagination
    permission_classes = [IsAuthenticated]

    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    # Настройка стандартного SearchFilter
    search_fields = [
        "article",
        "name",
        "name_zh",
        "category_1",
        "category_1_zh",
        "category_2",
        "category_2_zh",
        "composition",
        "composition_zh",
        "comments",
        "comments_zh",
    ]
    ordering_fields = "__all__"

    # Карта соответствия полей для локализации
    MAP_ZH_FIELDS = {
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

    # --- ВНУТРЕННЯЯ ЛОГИКА ---

    def _is_identical(self, db_obj, incoming_data):
        """Проверка на полный дубликат объекта (без учета количества и фото)."""
        for field_name, new_val in incoming_data.items():
            if field_name in [
                "amount_pieces",
                "amount_stores",
                "photos_list",
                "name_zh",
            ]:
                continue
            db_val = getattr(db_obj, field_name)
            if isinstance(db_val, date) and not isinstance(db_val, datetime):
                if new_val != db_val:
                    return False
                continue
            if str(db_val) != str(new_val):
                return False
        return True

    def _apply_export_filters(self, request):
        """Исправленная логика фильтрации для умного экспорта."""
        queryset = self.filter_queryset(self.get_queryset())

        # Получаем данные из JSON или из URL параметров
        data = request.data if isinstance(request.data, dict) else {}
        query_params = request.query_params

        # 1. Фильтрация по ID (Приоритет №1)
        ids = data.get("ids") or query_params.getlist("ids")
        if ids:
            # Если пришла строка "5,4", превращаем в список [5, 4]
            if isinstance(ids, str):
                ids = [x.strip() for x in ids.split(",") if x.strip()]

            # Приводим все ID к числам для безопасности БД
            try:
                clean_ids = [int(i) for i in ids]
                queryset = queryset.filter(id__in=clean_ids)
                # Если IDs переданы, мы больше ничего не фильтруем (пользователь выбрал конкретику)
                return queryset
            except (ValueError, TypeError):
                pass

        # 2. Фильтрация по поиску (если ID не выбраны)
        search_query = data.get("searchQuery") or query_params.get("searchQuery")
        if search_query:
            queryset = queryset.filter(
                Q(article__icontains=search_query)
                | Q(name__icontains=search_query)
                | Q(name_zh__icontains=search_query)
            )
        return queryset

    # --- API ЭНДПОИНТЫ ---

    @action(detail=False, methods=["get", "post"], url_path="data")
    def get_data(self, request):
        """Получение списка товаров (совместимо с GET/POST пагинацией)."""
        return self.list(request)

    @action(detail=False, methods=["get", "post"], url_path="search")
    def search_custom(self, request):
        """Глобальный индексированный поиск по всем полям (включая ID, даты и числа)."""
        params = request.query_params if request.method == "GET" else request.data
        query = params.get("query", "").strip()

        if not query:
            return Response([])

        # ПРЕОБРАЗОВАНИЕ ТИПОВ: Приводим нетекстовые поля к тексту в SQL
        # Это позволяет искать '5' в ID или '2025' в дате.
        qs = self.queryset.annotate(
            id_text=Cast("id", CharField()),
            price_text=Cast("price_actual", CharField()),
            date_text=Cast("date_creation", CharField()),
            quantum_text=Cast("quantum", CharField()),
            stores_text=Cast("amount_stores", CharField()),
            pieces_text=Cast("amount_pieces", CharField()),
            cbm_text=Cast("cbm", CharField()),
        )

        # ГЛОБАЛЬНЫЙ ФИЛЬТР (Использует GIN-индексы для текстовых полей)
        qs = qs.filter(
            # Текстовые поля (RU/ZH)
            Q(article__icontains=query)
            | Q(name__icontains=query)
            | Q(name_zh__icontains=query)
            | Q(category_1__icontains=query)
            | Q(category_1_zh__icontains=query)
            | Q(category_2__icontains=query)
            | Q(category_2_zh__icontains=query)
            | Q(composition__icontains=query)
            | Q(composition_zh__icontains=query)
            | Q(package_goods__icontains=query)
            | Q(package_goods_zh__icontains=query)
            | Q(tp__icontains=query)
            | Q(tp_zh__icontains=query)
            | Q(rd__icontains=query)
            | Q(rd_zh__icontains=query)
            | Q(risk__icontains=query)
            | Q(risk_zh__icontains=query)
            | Q(comments__icontains=query)
            | Q(comments_zh__icontains=query)
            | Q(tn_ved_code__icontains=query)
            |
            # Числовые поля и даты (через аннотации выше)
            Q(id_text__icontains=query)
            | Q(price_text__icontains=query)
            | Q(date_text__icontains=query)
            | Q(quantum_text__icontains=query)
            | Q(stores_text__icontains=query)
            | Q(pieces_text__icontains=query)
            | Q(cbm_text__icontains=query)
        ).distinct()

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="columns")
    def get_columns(self, request):
        """Возвращает список доступных столбцов модели Product."""
        columns = []
        for field in Product._meta.fields:
            columns.append(
                {
                    "name": field.name,
                    "type": field.get_internal_type(),
                    "verbose_name": field.verbose_name,
                }
            )
        return Response(columns)

    @action(detail=False, methods=["post"], url_path="import")
    def import_products(self, request):
        """Массовый импорт товаров с оптимизированным батчевым автопереводом.

        Оптимизации:
        - Батчевый перевод (50 текстов за раз)
        - Кэширование переводов (не переводим одинаковые тексты дважды)
        - Bulk операции для новых продуктов
        - Суммирует количество (amount_pieces) для существующих товаров
        """
        try:
            serializer = ProductImportSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            raw_data = serializer.validated_data["data"]
            approved = serializer.validated_data["approved"]

            if not raw_data:
                return Response({"error": "Файл пуст"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Validation error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            model_fields_types = {
                f.name: f.get_internal_type() for f in Product._meta.fields
            }

            # ШАГ 1: Подготовка данных и сбор текстов для перевода
            products_data = []
            texts_to_translate = set()  # Уникальные тексты для перевода

            for row in raw_data:
                row_clean = {clean_key(k): v for k, v in row.items()}
                article = str(row_clean.get("Артикул", "")).strip()
                if not article:
                    continue

                model_data = {}
                for e_h, m_f in EXCEL_TO_MODEL_MAP.items():
                    if e_h == "Артикул":
                        continue
                    # Для photos_list - объединяем, а не перезаписываем
                    if m_f == "photos_list":
                        new_photos = clean_val(
                            row_clean.get(clean_key(e_h)), model_fields_types.get(m_f), m_f
                        )
                        existing_photos = model_data.get("photos_list", [])
                        # Объединяем и убираем дубликаты
                        model_data[m_f] = list(dict.fromkeys(existing_photos + new_photos))
                    else:
                        model_data[m_f] = clean_val(
                            row_clean.get(clean_key(e_h)), model_fields_types.get(m_f), m_f
                        )

                # Собираем тексты для перевода
                for ru_f, zh_f in self.MAP_ZH_FIELDS.items():
                    val_ru = model_data.get(ru_f)
                    val_zh = model_data.get(zh_f)
                    if not is_empty(val_ru) and is_empty(val_zh):
                        texts_to_translate.add(str(val_ru))

                new_amount = clean_val(row_clean.get("Кол-во шт"), "int")
                products_data.append({
                    "article": article,
                    "model_data": model_data,
                    "new_amount": new_amount
                })

            # ШАГ 2: Батчевый перевод всех уникальных текстов
            translation_cache = {}
            if texts_to_translate:
                print(f"[IMPORT] Starting translation of {len(texts_to_translate)} unique texts")
                translator = GoogleTranslator(source="auto", target="zh-CN")
                texts_list = list(texts_to_translate)

                # Переводим батчами по 50 текстов
                batch_size = 50
                for i in range(0, len(texts_list), batch_size):
                    batch = texts_list[i:i + batch_size]
                    print(f"[IMPORT] Translating batch {i//batch_size + 1}, {len(batch)} texts")
                    try:
                        # translate_batch возвращает список переводов
                        translations = translator.translate_batch(batch)
                        for original, translated in zip(batch, translations):
                            translation_cache[original] = translated
                        print(f"[IMPORT] Batch translated successfully")
                        time.sleep(0.1)  # Небольшая задержка между батчами
                    except Exception as e:
                        print(f"[IMPORT] Batch failed: {e}, falling back to individual")
                        # При ошибке переводим по одному
                        for idx, text in enumerate(batch):
                            try:
                                translation_cache[text] = translator.translate(text)
                                if idx % 10 == 0:
                                    print(f"[IMPORT] Individual: {idx}/{len(batch)}")
                                time.sleep(0.05)
                            except:
                                translation_cache[text] = ""
                print(f"[IMPORT] Translation complete, {len(translation_cache)} cached")
            else:
                print("[IMPORT] No texts to translate")

            # ШАГ 3: Применяем переводы и разделяем на новые/существующие
            existing_articles = set(
                Product.objects.filter(
                    article__in=[p["article"] for p in products_data]
                ).values_list("article", flat=True)
            )

            products_to_create = []
            products_to_update = []

            for prod_data in products_data:
                article = prod_data["article"]
                model_data = prod_data["model_data"]
                new_amount = prod_data["new_amount"]

                # Применяем переводы из кэша
                for ru_f, zh_f in self.MAP_ZH_FIELDS.items():
                    val_ru = model_data.get(ru_f)
                    val_zh = model_data.get(zh_f)
                    if not is_empty(val_ru) and is_empty(val_zh):
                        model_data[zh_f] = translation_cache.get(str(val_ru), "")

                if article in existing_articles:
                    products_to_update.append({
                        "article": article,
                        "model_data": model_data,
                        "new_amount": new_amount
                    })
                else:
                    # Убираем amount_pieces из model_data, чтобы избежать дубликата
                    create_data = {k: v for k, v in model_data.items() if k != "amount_pieces"}
                    products_to_create.append(
                        Product(article=article, amount_pieces=new_amount, **create_data)
                    )

            # ШАГ 4: Bulk создание новых продуктов
            created = 0
            if products_to_create:
                try:
                    Product.objects.bulk_create(products_to_create, ignore_conflicts=True)
                    created = len(products_to_create)
                except Exception:
                    pass

            # ШАГ 5: Обновление существующих (по одному, т.к. используем F())
            updated = 0
            for prod_update in products_to_update:
                try:
                    product = Product.objects.get(article=prod_update["article"])
                    for f, v in prod_update["model_data"].items():
                        if f != "amount_pieces":
                            setattr(product, f, v)
                    product.amount_pieces = F("amount_pieces") + prod_update["new_amount"]
                    product.save()
                    updated += 1
                except Exception:
                    continue

            processed = created + updated
            return Response(
                {
                    "success": True,
                    "message": f"Обработано: {processed}. Создано: {created}. Обновлено: {updated}.",
                }
            )
        except Exception as e:
            import traceback
            return Response(
                {
                    "error": f"Import failed: {str(e)}",
                    "traceback": traceback.format_exc()
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["post"], url_path="fix-translations")
    def fix_translations(self, request):
        """Инструмент исправления: дозаполняет пустые китайские поля у всей базы."""
        products = Product.objects.all()
        translator = GoogleTranslator(source="auto", target="zh-CN")
        fixed_count = 0

        for p in products:
            changed = False
            for ru_f, zh_f in self.MAP_ZH_FIELDS.items():
                val_ru = getattr(p, ru_f)
                val_zh = getattr(p, zh_f)
                if not is_empty(val_ru) and is_empty(val_zh):
                    try:
                        setattr(p, zh_f, translator.translate(str(val_ru)))
                        changed = True
                        time.sleep(0.1)
                    except Exception:
                        continue
            if changed:
                p.save()
                fixed_count += 1

        return Response({"success": True, "fixed": fixed_count})

    @action(detail=False, methods=["get", "post"], url_path="export/excel")
    def export_excel(self, request):
        """Исправленный умный экспорт: фильтрация строк и колонок."""
        queryset = self._apply_export_filters(request)
        # Получаем данные через сериализатор (он обеспечит локализацию RU/ZH)
        serializer = self.get_serializer(
            queryset, many=True, context={"request": request}
        )

        # Получаем список колонок из POST или GET
        data = request.data if isinstance(request.data, dict) else {}
        selected_columns = data.get("columns") or request.query_params.getlist(
            "columns"
        )

        final_data = []
        for item in serializer.data:
            row = {}
            # Если выбранные колонки присланы, идем строго по ним
            if selected_columns:
                for col_name in selected_columns:
                    if col_name in item:
                        # Получаем красивый заголовок из маппинга, если его нет — используем имя поля
                        header = MODEL_TO_EXCEL_MAP.get(col_name, col_name)
                        row[header] = item[col_name]
            else:
                # Если колонки не выбраны, берем всё, что есть в стандартном Excel-маппинге
                for key, value in item.items():
                    if key in MODEL_TO_EXCEL_MAP:
                        header = MODEL_TO_EXCEL_MAP.get(key)
                        row[header] = value

            if row:
                final_data.append(row)

        if not final_data:
            return Response(
                {"error": "No data found for the given criteria"}, status=400
            )

        df = pd.DataFrame(final_data)
        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = "attachment; filename=products.xlsx"
        pd.DataFrame(final_data).to_excel(response, index=False)
        return response

    @action(detail=False, methods=["get", "post"], url_path="export/csv")
    def export_csv(self, request):
        """Умный экспорт в CSV: с поддержкой локализации и выбора колонок."""
        queryset = self._apply_export_filters(request)
        # ВАЖНО: Добавлен context для работы Accept-Language
        serializer = self.get_serializer(
            queryset, many=True, context={"request": request}
        )

        data = request.data if isinstance(request.data, dict) else {}
        raw_cols = (
            data.get("columns")
            or request.query_params.get("columns")
            or request.query_params.getlist("columns")
        )
        if isinstance(raw_cols, str):
            raw_cols = raw_cols.split(",")

        final_data = []
        for item in serializer.data:
            row = {
                MODEL_TO_EXCEL_MAP.get(k, k): v
                for k, v in item.items()
                if (raw_cols and k in raw_cols)
                or (not raw_cols and k in MODEL_TO_EXCEL_MAP)
            }
            if row:
                final_data.append(row)

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = "attachment; filename=products.csv"
        pd.DataFrame(final_data).to_csv(
            response, index=False, sep=";", encoding="utf-8-sig"
        )
        return response

    @action(detail=False, methods=["post"], url_path="clear-column")
    def clear_column(self, request):
        """Массовая очистка указанного столбца (кроме ID и Артикула)."""
        column = request.data.get("column")
        allowed_fields = [f.name for f in Product._meta.fields]
        if column not in allowed_fields or column in ["id", "article"]:
            return Response({"error": "Запрещено"}, status=status.HTTP_400_BAD_REQUEST)

        field_obj = Product._meta.get_field(column)
        default = (
            0
            if field_obj.get_internal_type()
            in ["IntegerField", "FloatField", "DecimalField"]
            else ""
        )
        Product.objects.all().update(**{column: default})
        return Response({"success": True})

    @action(detail=False, methods=["delete", "post"], url_path="delete")
    def delete_bulk(self, request):
        """Массовое удаление товаров по списку ID.

        URL: DELETE /api/products/delete/
        Body: [id1, id2, ...] или {"ids": [id1, id2, ...]}
        """
        ids = (
            request.data
            if isinstance(request.data, list)
            else request.data.get("ids", [])
        )
        if not ids:
            return Response({"error": "No IDs"}, status=status.HTTP_400_BAD_REQUEST)
        Product.objects.filter(id__in=ids).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="upload-photo")
    def upload_photo(self, request, pk=None):
        """Поддерживает внешние ССЫЛКИ и файлы в Base64."""
        product = self.get_object()
        raw_input = request.data.get("image") or request.data.get("file")
        if not raw_input:
            return Response({"error": "No input provided"}, status=400)

        current_photos = product.photos_list or []

        # 1. Если пришла ссылка (начинается с http)
        if isinstance(raw_input, str) and raw_input.startswith(("http://", "https://")):
            current_photos.append(raw_input)
            product.photos_list = current_photos
            product.save()
            return Response({"success": True, "photos": current_photos})

        # 2. Если пришел файл (Base64 или multipart)
        file_obj = request.FILES.get("file") or decode_base64_file(raw_input)
        if not file_obj:
            return Response({"error": "Invalid file or URL"}, status=400)

        ext = os.path.splitext(getattr(file_obj, "name", "img.jpg"))[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        path = default_storage.save(
            f"products/{filename}", ContentFile(file_obj.read())
        )

        relative_path = f"/media/{path}"
        current_photos.append(relative_path)
        product.photos_list = current_photos
        product.save()

        return Response(
            {
                "success": True,
                "photos": current_photos,
                "new_photo_url": request.build_absolute_uri(relative_path),
            }
        )
