"""
GET /api/dashboard - số liệu tổng quan của CLB cho Manager (quyền CLUB_MANAGE). Tính trực tiếp từ dữ liệu.
Phần Training / Medical / Care chỉ có khi đã cài Flow 2 / Flow 3 / Flow 4 (nếu chưa có thì là null).
"""
from collections import Counter
from datetime import date, timedelta

from django.db.models import Avg
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from . import flows
from .permissions import HasAnyPermission
from .serializers import fmt_datetime


def _count(queryset, field):
    return dict(Counter(queryset.values_list(field, flat=True)))


def users_block(club_id):
    from apps.accounts.models import User, UserRole

    users = User.objects.filter(club_id=club_id)
    return {
        "Total": users.count(),
        "ByStatus": _count(users, "status"),
        "ByRole": _count(UserRole.objects.filter(user__club_id=club_id, user__status="Active"), "role__code"),
    }


def horses_block(club_id):
    from apps.horses.models import Horse, Stall

    horses = Horse.objects.filter(club_id=club_id)
    stalls = Stall.objects.filter(club_id=club_id)
    return {
        "Total": horses.exclude(registration_status="Archived").count(),
        "ByRegistrationStatus": _count(horses, "registration_status"),
        "ApprovedByHealthStatus": _count(horses.filter(registration_status="Approved"), "current_health_status"),
        "Stalls": {"Total": stalls.count(), "ByStatus": _count(stalls, "status")},
    }


def training_block(club_id, today):
    if not flows.has_training():
        return None
    from apps.training.models import TrainerHorseAssignment, TrainingPlan, TrainingResult, TrainingSession

    week_start = today - timedelta(days=today.weekday())
    sessions = TrainingSession.objects.filter(stage__plan__assignment__horse__club_id=club_id)
    month = sessions.filter(session_date__gte=today - timedelta(days=30), session_date__lte=today)
    score = TrainingResult.objects.filter(session__in=month.filter(status="Completed")).aggregate(
        avg=Avg("performance_score"))["avg"]
    return {
        "ActiveAssignments": TrainerHorseAssignment.objects.filter(horse__club_id=club_id, status="Active").count(),
        "PlansByStatus": _count(TrainingPlan.objects.filter(assignment__horse__club_id=club_id), "status"),
        "SessionsToday": _count(sessions.filter(session_date=today), "status"),
        "SessionsThisWeek": _count(sessions.filter(session_date__gte=week_start,
                                                   session_date__lt=week_start + timedelta(days=7)), "status"),
        "SessionsLast30Days": _count(month, "status"),
        "AvgPerformanceScore30Days": round(float(score), 1) if score is not None else None,
        "SessionsAwaitingReview": sessions.filter(status="Completed", reviews__isnull=True).count(),
    }


def medical_block(club_id, today):
    if not flows.has_flow3():
        return None
    from apps.medical.models import HealthReport, MedicalSchedule, TrainingLock, Vaccination

    open_reports = HealthReport.objects.filter(horse__club_id=club_id).exclude(status="Resolved")
    soon = today + timedelta(days=14)
    return {
        "OpenHealthReports": open_reports.count(),
        "UrgentOpenHealthReports": open_reports.filter(severity="Urgent").count(),
        "ActiveTrainingLocks": _count(TrainingLock.objects.filter(horse__club_id=club_id, lock_status="Active"),
                                      "lock_level"),
        "VaccinationsDue14Days": Vaccination.objects.filter(horse__club_id=club_id, status="Scheduled",
                                                           vaccination_date__lte=soon).count(),
        "MedicalSchedulesDue14Days": MedicalSchedule.objects.filter(horse__club_id=club_id, status="Scheduled",
                                                                   scheduled_date__lte=soon).count(),
    }


def care_block(club_id, today):
    if not flows.has_care():
        return None
    from apps.care.models import CareTask, DietPlan, InventoryItem, InventoryRequest

    return {
        "DietPlansByStatus": _count(DietPlan.objects.filter(horse__club_id=club_id)
                                    .exclude(status="Expired"), "status"),
        "CareTasksToday": _count(CareTask.objects.filter(horse__club_id=club_id, scheduled_at__date=today), "status"),
        "OverdueCareTasks": CareTask.objects.filter(horse__club_id=club_id, status="Pending",
                                                    scheduled_at__lt=timezone.now()).count(),
        "InventoryByStatus": _count(InventoryItem.objects.filter(club_id=club_id), "status"),
        "PendingInventoryRequests": InventoryRequest.objects.filter(club_id=club_id, status="Pending").count(),
    }


class ClubDashboardView(APIView):
    permission_classes = [HasAnyPermission("CLUB_MANAGE")]

    def get(self, request):
        club_id, today = request.user.club_id, date.today()
        return Response({
            "ClubID": club_id,
            "GeneratedAt": fmt_datetime(timezone.now()),
            "Users": users_block(club_id),
            "Horses": horses_block(club_id),
            "Training": training_block(club_id, today),
            "Medical": medical_block(club_id, today),
            "Care": care_block(club_id, today),
        })
