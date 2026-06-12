from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

admin.site.site_header = 'Sheber PMS'
admin.site.site_title = 'Sheber PMS'
admin.site.index_title = 'Управление системой'

urlpatterns = [
    path('admin/', admin.site.urls),

    # API v1  — плоская структура, каждый роутер сам содержит префикс
    path('api/v1/', include([
        path('auth/',          include('apps.users.urls.auth')),
        path('users/',         include('apps.users.urls.users')),
        path('organizations/', include('apps.organizations.urls')),
        path('dashboard/',     include('apps.core.urls')),
        # Остальные роутеры подключаются без доп. префикса — они сами его содержат
        # /api/v1/properties/, /api/v1/rooms/, /api/v1/units/
        path('', include('apps.properties.urls')),
        # /api/v1/guests/
        path('', include('apps.guests.urls')),
        # /api/v1/stays/
        path('', include('apps.stays.urls')),
        # /api/v1/payments/, /api/v1/expenses/, /api/v1/summary/
        path('', include('apps.payments.urls')),
        # /api/v1/leads/, /api/v1/viewings/
        path('', include('apps.leads.urls')),
        # /api/v1/blacklist/
        path('', include('apps.blacklist.urls')),
        # /api/v1/notifications/
        path('', include('apps.notifications.urls')),
    ])),

    # API Docs (swagger)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    try:
        import debug_toolbar
        urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
