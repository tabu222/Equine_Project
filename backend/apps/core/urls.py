from django.urls import path

from . import dashboard, views
from .notifications import NotificationReadView, NotificationUnreadCountView, NotificationView

urlpatterns = [
    path("health", views.health, name="health"),
    path("notifications", NotificationView.as_view(), name="notifications"),
    path("notifications/unread-count", NotificationUnreadCountView.as_view(), name="notifications-unread"),
    path("notifications/read", NotificationReadView.as_view(), name="notifications-read"),
    path("dashboard", dashboard.ClubDashboardView.as_view(), name="club-dashboard"),
]
