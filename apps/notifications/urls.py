from django.urls import path
from . import views

urlpatterns = [
    path('notifications/',           views.NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/read/', views.mark_read,                  name='notification-read'),
    path('notifications/read-all/',  views.mark_all_read,                  name='notification-read-all'),
]
