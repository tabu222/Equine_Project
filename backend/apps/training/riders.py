"""
Kỵ sĩ tập (Work Rider) và người giám sát thay - Flow 2.

Kỵ sĩ chính:  HLV trưởng chọn lúc phân công Trainer (hoặc đổi sau). Lưu là HorseWorkRiderPreference Priority = 1
              còn hiệu lực. Chỉ HLV trưởng được đổi.
Xếp buổi tập: Trainer phụ trách xếp; không gửi WorkRiderID -> tự điền kỵ sĩ chính. Kỵ sĩ chính bận giờ đó -> báo để
              Trainer chọn người khác CHO RIÊNG BUỔI ĐÓ (ưu tiên đúng chuyên môn). Đổi khỏi kỵ sĩ chính -> báo HLV trưởng.
Giám sát thay: HLV trưởng chọn khi Trainer phụ trách nghỉ / bận; gợi ý người cùng chuyên môn trước (không bắt buộc).
"""
from datetime import date, datetime, timedelta

from apps.core.audit import log_action
from apps.core.exceptions import BusinessRuleError
from apps.core.permissions import club_users_with_role, require_club_user

from .models import (
    HorseWorkRiderPreference, TrainerSpecialization, TrainingSession, WorkRiderSpecialization,
)

ACTIVE_SESSION = ("Assigned", "In Progress")
DEFAULT_MINUTES = 60
MAIN_PRIORITY = 1


# ---------------------------------------------------------------------------
# Kỵ sĩ chính
# ---------------------------------------------------------------------------
def main_preference(horse):
    return (HorseWorkRiderPreference.objects.filter(horse=horse, end_date__isnull=True, priority=MAIN_PRIORITY)
            .select_related("work_rider").order_by("-start_date", "-id").first())


def main_rider(horse):
    pref = main_preference(horse)
    return pref.work_rider if pref else None


def _end(pref):
    pref.end_date = max(date.today(), pref.start_date)
    pref.is_preferred = False
    pref.save(update_fields=["end_date", "is_preferred"])


def set_main_rider(horse, user, work_rider_id, note=None):
    """HLV trưởng đặt / đổi kỵ sĩ chính. Kỵ sĩ chính cũ kết thúc; buổi đã xếp giữ nguyên người cưỡi."""
    from .services import ensure_horse_in_training

    ensure_horse_in_training(horse)
    rider = require_club_user(work_rider_id, horse.club_id, "WORK_RIDER", field="WorkRiderID")
    current = main_preference(horse)
    if current is not None and current.work_rider_id == rider.pk:
        return current
    previous = current.work_rider_id if current else None
    for pref in HorseWorkRiderPreference.objects.filter(horse=horse, end_date__isnull=True).filter(
            priority=MAIN_PRIORITY) | HorseWorkRiderPreference.objects.filter(horse=horse, end_date__isnull=True,
                                                                             work_rider=rider):
        _end(pref)
    pref = HorseWorkRiderPreference.objects.create(
        horse=horse, work_rider=rider, assigned_by=user, start_date=date.today(), priority=MAIN_PRIORITY,
        is_preferred=True, note=(note or "").strip() or "Kỵ sĩ chính",
    )
    log_action(user, "SET_MAIN_WORK_RIDER", horse, {"WorkRiderID": rider.pk, "PreviousWorkRiderID": previous})
    return pref


# ---------------------------------------------------------------------------
# Lịch bận của kỵ sĩ / trainer
# ---------------------------------------------------------------------------
def _window(day, start, end=None, minutes=None):
    begin = datetime.combine(day, start)
    if end is not None and end > start:
        return begin, datetime.combine(day, end)
    return begin, begin + timedelta(minutes=minutes or DEFAULT_MINUTES)


def session_window(session):
    return _window(session.session_date, session.start_time, session.end_time, session.duration_planned_minutes)


def _overlaps(sessions, begin, finish):
    for other in sessions:
        o_begin, o_finish = session_window(other)
        if o_begin < finish and begin < o_finish:
            return other
    return None


def rider_conflict(rider, day, start, end=None, minutes=None, exclude_id=None):
    """Buổi tập khác của kỵ sĩ trùng giờ (None nếu rảnh)."""
    begin, finish = _window(day, start, end, minutes)
    others = TrainingSession.objects.filter(work_rider=rider, session_date=day, status__in=ACTIVE_SESSION)
    if exclude_id:
        others = others.exclude(pk=exclude_id)
    return _overlaps(others, begin, finish)


def supervisor_conflict(trainer, day, start, end=None, minutes=None, exclude_id=None):
    """Buổi khác mà trainer đang phải giám sát trùng giờ (phụ trách hoặc giám sát thay)."""
    from django.db.models import Q

    begin, finish = _window(day, start, end, minutes)
    others = TrainingSession.objects.filter(session_date=day, status__in=ACTIVE_SESSION).filter(
        Q(substitute_trainer=trainer) | Q(substitute_trainer__isnull=True, stage__plan__assignment__trainer=trainer))
    if exclude_id:
        others = others.exclude(pk=exclude_id)
    return _overlaps(others, begin, finish)


def horse_specialization_id(horse):
    from .services import active_assignment

    assignment = active_assignment(horse)
    return assignment.specialization_id if assignment else None


def _rider_row(rider, spec_id, main, conflict):
    specs = list(WorkRiderSpecialization.objects.filter(work_rider=rider).select_related("specialization"))
    return {
        "UserID": rider.pk, "FullName": rider.full_name, "Email": rider.email,
        "Specializations": [{"SpecializationID": s.specialization_id, "SpecializationName": s.specialization.name}
                            for s in specs],
        "IsMainRider": main is not None and main.pk == rider.pk,
        "MatchesSpecialization": spec_id is not None and any(s.specialization_id == spec_id for s in specs),
        "IsBusy": conflict is not None,
        "BusyWithSessionID": conflict.pk if conflict else None,
    }


def _sort(rows):
    rows.sort(key=lambda r: (not r["IsMainRider"], not r["MatchesSpecialization"], r["IsBusy"], r["FullName"]))
    return rows


def rider_rows(horse, day=None, start=None, end=None, minutes=None, exclude_id=None, specialization_id=None):
    """Work Rider trong CLB cho một ngựa, xếp: kỵ sĩ chính -> đúng chuyên môn -> rảnh giờ đó -> tên."""
    spec_id = specialization_id or horse_specialization_id(horse)
    main = main_rider(horse)
    rows = []
    for rider in club_users_with_role(horse.club_id, "WORK_RIDER"):
        conflict = rider_conflict(rider, day, start, end, minutes, exclude_id) if day and start else None
        rows.append(_rider_row(rider, spec_id, main, conflict))
    return _sort(rows)


def rider_rows_for_club(club_id, specialization_id=None, user_id=None):
    """Danh sách Work Rider của CLB kèm chuyên môn (không gắn với ngựa nào)."""
    riders = club_users_with_role(club_id, "WORK_RIDER")
    if user_id is not None:
        riders = riders.filter(pk=user_id)
    return _sort([_rider_row(r, specialization_id, None, None) for r in riders])


def substitute_rows(session):
    """Người giám sát thay cho một buổi: Trainer / HLV trưởng khác trong CLB, cùng chuyên môn trước, rảnh trước."""
    assignment = session.assignment
    spec_id = assignment.specialization_id
    rows = []
    for person in club_users_with_role(assignment.horse.club_id, "TRAINER", "HEAD_TRAINER").exclude(
            pk=assignment.trainer_id):
        matches = TrainerSpecialization.objects.filter(trainer=person, specialization_id=spec_id).exists()
        conflict = supervisor_conflict(person, session.session_date, session.start_time, session.end_time,
                                       session.duration_planned_minutes, exclude_id=session.pk)
        roles = sorted(person.roles.values_list("code", flat=True))
        rows.append({
            "UserID": person.pk, "FullName": person.full_name, "Roles": roles,
            "MatchesSpecialization": matches, "IsBusy": conflict is not None,
            "IsCurrentSubstitute": session.substitute_trainer_id == person.pk,
        })
    rows.sort(key=lambda r: (not r["MatchesSpecialization"], r["IsBusy"], "HEAD_TRAINER" in r["Roles"],
                             r["FullName"]))
    return rows


# ---------------------------------------------------------------------------
# Chuyên môn Work Rider
# ---------------------------------------------------------------------------
def add_rider_specialization(rider, specialization, user):
    if WorkRiderSpecialization.objects.filter(work_rider=rider, specialization=specialization).exists():
        raise BusinessRuleError("Work Rider đã có chuyên môn này.", "ALREADY_EXISTS")
    link = WorkRiderSpecialization.objects.create(work_rider=rider, specialization=specialization)
    log_action(user, "ADD_RIDER_SPECIALIZATION", rider, {"SpecializationID": specialization.pk})
    return link


def remove_rider_specialization(rider, specialization, user):
    deleted, _ = WorkRiderSpecialization.objects.filter(work_rider=rider, specialization=specialization).delete()
    if not deleted:
        raise BusinessRuleError("Work Rider không có chuyên môn này.", "NOT_FOUND")
    log_action(user, "REMOVE_RIDER_SPECIALIZATION", rider, {"SpecializationID": specialization.pk})
