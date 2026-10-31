"""Email Flow 2 gửi nhân sự CLB (Head Trainer): chỉ việc quan trọng, phần còn lại xem trên chuông thông báo."""
from apps.core.emails import send_email
from apps.core.permissions import club_users_with_role


def _head_trainers(club_id):
    return [u.email for u in club_users_with_role(club_id, "HEAD_TRAINER")]


def stage_closed(stage):
    """Trainer chốt giai đoạn -> Head Trainer nhận tổng kết giai đoạn (cùng nội dung chủ ngựa nhận)."""
    from .owner_emails import _label, _summary_lines
    from .summaries import plan_summary

    plan = stage.plan
    horse = plan.assignment.horse
    row = next(s for s in plan_summary(plan)["Stages"] if s["TrainingPlanStageID"] == stage.id)
    lines = _summary_lines(row["Summary"])
    diff = row["ComparedToPreviousStage"]
    if diff and diff.get("AvgPerformanceScore") is not None:
        lines.append(f"So với giai đoạn trước: điểm TB {diff['AvgPerformanceScore']:+.1f}".replace(".", ","))
    send_email(_head_trainers(horse.club_id),
               f"Tổng kết giai đoạn {stage.stage_order} – {stage.stage_name} · {horse.horse_name}", (
                   f"Trainer {plan.assignment.trainer.full_name} đã chốt giai đoạn \"{stage.stage_name}\" "
                   f"trong giáo án \"{plan.goal or f'#{plan.id}'}\" của {_label(horse)}.\n\n"
                   + "\n".join(lines)
                   + (f"\n\nNhận xét của trainer: {stage.summary_note}" if stage.summary_note else "")
                   + "\n\nXem chi tiết và điều chỉnh giáo án (nếu cần) trong mục Huấn luyện."
               ))
