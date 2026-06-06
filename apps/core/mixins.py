"""
Миксины для ViewSet'ов.
OrganizationMixin — автоматически фильтрует queryset по organization пользователя.
"""


class OrganizationMixin:
    """
    Добавить к любому ViewSet для автоматической изоляции данных.
    - get_queryset() фильтрует по organization пользователя
    - perform_create() автоматически проставляет organization
    """

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_authenticated:
            return qs.filter(organization=self.request.user.organization)
        return qs.none()

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)
