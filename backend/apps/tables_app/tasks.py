from celery import shared_task
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
import os
import logging

logger = logging.getLogger(__name__)

LIBRETRANSLATE_URL = os.environ.get("LIBRETRANSLATE_URL", "http://libretranslate:5000")


def translate_single(text, source, target):
    """Перевод через LibreTranslate (локальный, без лимитов)."""
    try:
        response = requests.post(
            f"{LIBRETRANSLATE_URL}/translate",
            json={"q": text, "source": source, "target": target},
            timeout=30
        )
        if response.status_code == 200:
            return response.json().get("translatedText")
        logger.warning(f"LibreTranslate error: {response.status_code}")
    except Exception as e:
        logger.warning(f"Failed: '{text[:30]}...': {e}")
    return None


@shared_task
def fix_translations_task():
    """Двусторонний параллельный перевод полей товаров."""
    from .models import Product

    field_pairs = [
        ("name", "name_zh"),
        ("category_1", "category_1_zh"),
        ("category_2", "category_2_zh"),
        ("composition", "composition_zh"),
        ("package_goods", "package_goods_zh"),
        ("tp", "tp_zh"),
        ("rd", "rd_zh"),
        ("risk", "risk_zh"),
        ("comments", "comments_zh"),
    ]

    def is_blank(v):
        return v is None or str(v).strip() in ["", "—", "-", "nan", "None"]

    products = list(Product.objects.all())
    logger.info(f"Processing {len(products)} products")

    # Собираем задачи на перевод
    tasks = []  # [(prod_idx, field_to_set, text, source, target)]

    for idx, p in enumerate(products):
        for ru_f, zh_f in field_pairs:
            val_ru = getattr(p, ru_f)
            val_zh = getattr(p, zh_f)

            if not is_blank(val_ru) and is_blank(val_zh):
                tasks.append((idx, zh_f, str(val_ru).strip(), "ru", "zh"))
            elif is_blank(val_ru) and not is_blank(val_zh):
                tasks.append((idx, ru_f, str(val_zh).strip(), "zh", "ru"))

    logger.info(f"Total translations: {len(tasks)}")

    if not tasks:
        return "Нечего переводить"

    changed_products = set()

    # Параллельный перевод (20 потоков - LibreTranslate локальный, без лимитов)
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {}
        for task in tasks:
            prod_idx, field, text, source, target = task
            future = executor.submit(translate_single, text, source, target)
            futures[future] = (prod_idx, field)

        done_count = 0
        for future in as_completed(futures, timeout=300):  # 5 мин общий timeout
            prod_idx, field = futures[future]
            try:
                result = future.result(timeout=15)  # 15 сек на каждый
                if result:
                    setattr(products[prod_idx], field, result)
                    changed_products.add(prod_idx)
            except Exception as e:
                logger.warning(f"Skip translation: {e}")

            done_count += 1
            if done_count % 10 == 0:
                logger.info(f"Progress: {done_count}/{len(tasks)}")

    # Сохраняем
    for idx in changed_products:
        products[idx].save()

    result = f"Переведено товаров: {len(changed_products)}"
    logger.info(result)
    return result
