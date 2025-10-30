import apps.products.models
from django.db import migrations, models
import django.db.models.deletion
from typing import List, Tuple


class Migration(migrations.Migration):
    """
    Initial migration for the products app.

    This migration creates the Product and ProductPhoto models.
    """

    initial = True

    dependencies: List[Tuple[str, str]] = [
    ]

    operations = [
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('kp_date', models.DateField(blank=True, null=True, verbose_name='Дата КП')),
                ('category_level_1', models.CharField(blank=True, max_length=255, null=True, verbose_name='Категория. Уровень 1')),
                ('category_level_2', models.CharField(blank=True, max_length=255, null=True, verbose_name='Категория. Уровень 2')),
                ('video_url', models.URLField(blank=True, max_length=1024, null=True, verbose_name='Видео (ссылка)')),
                ('sku', models.CharField(db_index=True, max_length=100, unique=True, verbose_name='Артикул')),
                ('name', models.CharField(max_length=512, verbose_name='Наименование товара')),
                ('composition', models.TextField(blank=True, null=True, verbose_name='Состав')),
                ('product_size', models.CharField(blank=True, max_length=255, null=True, verbose_name='Размер товара')),
                ('packaging', models.CharField(blank=True, max_length=255, null=True, verbose_name='Упаковка товара')),
                ('group_packaging', models.CharField(blank=True, max_length=255, null=True, verbose_name='Групповая упаковка')),
                ('quantum', models.IntegerField(blank=True, null=True, verbose_name='Квант')),
                ('actual_price', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True, verbose_name='Фактическая цена, ₽')),
                ('shipping_box_load', models.CharField(blank=True, max_length=255, null=True, verbose_name='Загрузка транспортного короба')),
                ('width_cm', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Width, cm')),
                ('height_cm', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Height, cm')),
                ('length_cm', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Length, cm')),
                ('cbm', models.DecimalField(blank=True, decimal_places=4, max_digits=10, null=True, verbose_name='CBM')),
                ('shipping_box_gross_weight', models.DecimalField(blank=True, decimal_places=3, max_digits=10, null=True, verbose_name='Брутто транспортного короба')),
                ('tn_ved_code', models.CharField(blank=True, max_length=100, null=True, verbose_name='ТН ВЭД код')),
                ('tp', models.TextField(blank=True, null=True, verbose_name='ТП')),
                ('rd', models.TextField(blank=True, null=True, verbose_name='РД')),
                ('risk', models.TextField(blank=True, null=True, verbose_name='Риск')),
                ('vat_rate', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, verbose_name='НДС')),
                ('store_quantity', models.IntegerField(blank=True, null=True, verbose_name='Кол-во магазинов')),
                ('item_quantity', models.IntegerField(blank=True, null=True, verbose_name='Кол-во шт')),
                ('comments', models.TextField(blank=True, null=True, verbose_name='Комментарии')),
            ],
            options={
                'verbose_name': 'Product',
                'verbose_name_plural': 'Products',
                'ordering': ['-kp_date', 'name'],
            },
        ),
        migrations.CreateModel(
            name='ProductPhoto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to=apps.products.models.product_photo_upload_path, verbose_name='Image')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='photos', to='products.product', verbose_name='Product')),
            ],
            options={
                'verbose_name': 'Product Photo',
                'verbose_name_plural': 'Product Photos',
                'ordering': ['id'],
            },
        ),
    ]
