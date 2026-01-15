from celery import shared_task
from deep_translator import GoogleTranslator
import time


@shared_task
def fix_translations_task():
    """Фоновая задача для перевода пустых китайских полей товаров."""
    from .models import Product

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

    return f"Переведено товаров: {fixed_count}"
