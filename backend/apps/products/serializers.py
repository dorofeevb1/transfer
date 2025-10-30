from rest_framework import serializers
from .models import Product, ProductPhoto
from typing import Any, Dict


class ProductPhotoSerializer(serializers.ModelSerializer):
    """
    Serializer for the ProductPhoto model.

    Handles the serialization and deserialization of product photo instances.
    """

    class Meta:
        """
        Meta options for the ProductPhotoSerializer.
        """
        model = ProductPhoto
        fields: str = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for the Product model.

    Includes nested serialization for related photos and provides a comprehensive
    representation of a product for the API.
    """
    photos = ProductPhotoSerializer(many=True, read_only=True)

    class Meta:
        """
        Meta options for the ProductSerializer.
        """
        model = Product
        fields: str = '__all__'

    def to_representation(self, instance: Product) -> Dict[str, Any]:
        """
        Customizes the serialized representation of a Product.

        Specifically, it formats the 'photos' field to be a simple list of URLs.

        Args:
            instance: The Product instance to serialize.

        Returns:
            Dict[str, Any]: The serialized product data.
        """
        representation = super().to_representation(instance)
        request = self.context.get('request')
        if request and instance.photos.exists():
            representation['photos'] = [request.build_absolute_uri(photo.image.url) for photo in instance.photos.all()]
        else:
            representation['photos'] = []
        return representation
