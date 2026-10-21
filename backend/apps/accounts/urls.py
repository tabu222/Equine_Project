from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("auth/login", views.LoginView.as_view(), name="login"),
    path("auth/register", views.RegisterView.as_view(), name="register"),
    path("auth/google", views.GoogleLoginView.as_view(), name="google-login"),
    path("auth/refresh", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me", views.MeView.as_view(), name="me"),
    path("users", views.UserListCreateView.as_view(), name="user-list"),
    path("users/<int:user_id>", views.UserDetailView.as_view(), name="user-detail"),
    # Tài khoản cá nhân
    path("auth/change-password", views.ChangePasswordView.as_view(), name="change-password"),
    path("auth/password-reset", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path("auth/password-reset/confirm", views.PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    # Quản trị (Manager)
    path("users/<int:user_id>/roles", views.UserRolesView.as_view(), name="user-roles"),
    path("users/<int:user_id>/lock", views.UserLockView.as_view(), name="user-lock"),
    path("users/<int:user_id>/unlock", views.UserUnlockView.as_view(), name="user-unlock"),
    path("users/<int:user_id>/reset-password", views.UserResetPasswordView.as_view(), name="user-reset-password"),
    path("roles", views.RoleMatrixView.as_view(), name="roles"),
    path("roles/reset-defaults", views.RoleResetDefaultsView.as_view(), name="roles-reset"),
    path("roles/<str:role_code>/permissions", views.RolePermissionsView.as_view(), name="role-permissions"),
    path("audit-logs", views.AuditLogListView.as_view(), name="audit-logs"),
    path("clubs/mine", views.MyClubView.as_view(), name="my-club"),
]
