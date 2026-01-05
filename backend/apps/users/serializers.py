# backend/apps/users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Кастомный сериализатор токена для добавления роли и статуса в ответ."""

    def validate(self, attrs):
        data = super().validate(attrs)
        # Формируем ответ точно под требования AuthService на фронте
        return {
            'success': True,
            'token': data['access'],  # Фронт ждет поле 'token', а не 'access'
            'refresh': data['refresh'],
            'role': self.user.role,
            'email': self.user.email
        }


class UserSerializer(serializers.ModelSerializer):
    """Сериализатор для модели пользователя с автолокализацией RU/ZH."""

    # Маппинг ключей перевода с фронтенда на реальные значения
    ROLE_MAP = {
        'USERS_TABLE.ROLES.ADMIN': 'admin',
        'USERS_TABLE.ROLES.MANAGER': 'manager',
        'USERS_TABLE.ROLES.CLIENT': 'client',
        'USERS_TABLE.ROLES.MERCHANDISER': 'merchandiser',
    }
    ACCESS_MAP = {
        'USERS_TABLE.ACCESS_LEVELS.VIEW_EDIT': 'view_edit',
        'USERS_TABLE.ACCESS_LEVELS.VIEW_ONLY': 'view_only',
    }

    class Meta:
        model = User
        fields = ['id', 'fio', 'fio_zh', 'email', 'role', 'access', 'password']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'id': {'read_only': True}
        }

    def to_internal_value(self, data):
        """Преобразование ключей перевода в реальные значения перед валидацией."""
        data = data.copy() if hasattr(data, 'copy') else dict(data)

        # Преобразуем role
        if 'role' in data and data['role'] in self.ROLE_MAP:
            data['role'] = self.ROLE_MAP[data['role']]

        # Преобразуем access
        if 'access' in data and data['access'] in self.ACCESS_MAP:
            data['access'] = self.ACCESS_MAP[data['access']]

        return super().to_internal_value(data)

    def to_representation(self, instance):
        """Автоматическая локализация по Accept-Language."""
        data = super().to_representation(instance)
        request = self.context.get("request")

        # Маппинг полей RU → ZH
        translation_map = {
            "fio": "fio_zh",
        }

        if request:
            lang = request.headers.get("Accept-Language", "ru").lower()
            if "zh" in lang:
                # Подменяем RU поля на ZH значения (если ZH не пусто)
                for ru_field, zh_field in translation_map.items():
                    zh_val = data.get(zh_field)
                    if zh_val and str(zh_val).strip() not in ["", "—", "-", "nan"]:
                        data[ru_field] = zh_val

        # Удаляем технические ZH поля из ответа
        for zh_field in translation_map.values():
            data.pop(zh_field, None)

        return data

    def create(self, validated_data):
        """Создание пользователя с хешированием пароля."""
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        """Обновление пользователя с хешированием пароля (если передан)."""
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user