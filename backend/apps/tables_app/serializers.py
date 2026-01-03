# backend/apps/tables_app/serializers.py
from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    """Сериализатор товара: полная автоматизация локализации и ссылок на фото."""

    class Meta:
        model = Product
        exclude = ("extra_data",)  # Скрываем, чтобы не грузить фронт

    def to_representation(self, instance):
        """Вызывается для каждого товара при получении таблицы.

        Гарантирует, что фронтенд получит:
        1. Только нужный язык (RU или ZH) в основных полях.
        2. Полные, готовые к отображению URL в поле photos_list.
        """
        data = super().to_representation(instance)
        request = self.context.get("request")

        # --- 1. АВТО-ЛОКАЛИЗАЦИЯ (RU/ZH) ---
        translation_map = {
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

        if request:
            lang = request.headers.get("Accept-Language", "ru").lower()
            if "zh" in lang:
                for ru_f, zh_f in translation_map.items():
                    zh_val = data.get(zh_f)
                    # Если в китайском поле есть реальные данные, подменяем русское
                    if zh_val and str(zh_val).strip() not in [
                        "",
                        "—",
                        "-",
                        "nan",
                        "None",
                        ".",
                    ]:
                        data[ru_f] = zh_val

        # Удаляем технические ZH поля, чтобы фронт их не рисовал
        for zh_field in translation_map.values():
            data.pop(zh_field, None)

        # --- 2. АВТО-ССЫЛКИ НА ФОТО ---
        # Превращаем ["/media/1.jpg"] в ["https://domain/media/1.jpg"]
        photos = data.get("photos_list")
        if request and photos and isinstance(photos, list):
            full_urls = []
            for path in photos:
                if not path:
                    continue
                # Если это уже внешняя ссылка (http), не трогаем её
                if str(path).startswith(("http://", "https://")):
                    full_urls.append(path)
                else:
                    # Если это локальный файл, доклеиваем домен сервера
                    full_urls.append(request.build_absolute_uri(path))
            data["photos_list"] = full_urls

        return data


class ProductImportSerializer(serializers.Serializer):
    """Валидация для массовой загрузки данных."""

    data = serializers.ListField(child=serializers.DictField())
    approved = serializers.BooleanField(default=False)
