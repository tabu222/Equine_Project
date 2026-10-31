"""
Flow 2 bổ sung: kỵ sĩ chính (HLV trưởng chọn), tự điền khi xếp buổi, kỵ sĩ bận, đổi kỵ sĩ báo HLV trưởng,
chuyên môn Work Rider, HLV trưởng chọn người giám sát thay, tổng kết giai đoạn gửi HLV trưởng.
"""

from django.core import mail

from apps.training.models import WorkRiderSpecialization

from .base import TODAY, TrainingTestCase


def body(stage_id, start="06:00", **extra):
    return {"TrainingPlanStageID": stage_id, "SessionDate": TODAY.isoformat(), "StartTime": start,
            "TrainingType": "Canter", "DurationPlannedMinutes": 45, "TrainingLoad": 30, **extra}


class MainRiderTests(TrainingTestCase):
    def ready_with_main_rider(self):
        horse_id = self.approved_horse()
        res = self.client_for(self.head).post("/api/trainer-assignments", {
            "HorseID": horse_id, "TrainerID": self.trainer.id, "SpecializationID": self.flat.id,
            "WorkRiderID": self.rider.id}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["MainWorkRiderID"], self.rider.id)
        plan = self.active_plan(horse_id)
        return horse_id, plan["Stages"][0]["TrainingPlanStageID"]

    def notes(self, user, kind):
        return [n for n in self.client_for(user).get("/api/notifications").data if n["Type"] == kind]

    def test_main_rider_is_filled_and_change_is_reported(self):
        horse_id, stage_id = self.ready_with_main_rider()
        trainer = self.client_for(self.trainer)
        # không chọn kỵ sĩ -> tự điền kỵ sĩ chính
        first = trainer.post("/api/training-sessions", body(stage_id), format="json")
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(first.data["WorkRiderID"], self.rider.id)
        self.assertEqual(self.notes(self.head, "RIDER_CHANGED"), [])
        # kỵ sĩ chính đã kín giờ đó -> báo để chọn người khác cho riêng buổi này
        busy = trainer.post("/api/training-sessions", body(stage_id, "06:30"), format="json")
        self.assertEqual(busy.data["code"], "MAIN_RIDER_BUSY")
        second = trainer.post("/api/training-sessions", body(stage_id, "06:30", WorkRiderID=self.rider2.id,
                                                             RiderChangeReason="An kín lịch"), format="json")
        self.assertEqual(second.status_code, 201, second.data)
        changed = self.notes(self.head, "RIDER_CHANGED")
        self.assertEqual(changed[0]["EntityID"], second.data["TrainingSessionID"])
        self.assertEqual(changed[0]["Message"], "An kín lịch")
        # kỵ sĩ chính của ngựa vẫn giữ nguyên
        self.assertEqual(trainer.get(f"/api/horses/{horse_id}/main-work-rider").data["WorkRiderID"], self.rider.id)
        # sửa buổi: đổi kỵ sĩ -> Head Trainer được báo, kỵ sĩ bị thay được báo
        third = trainer.post("/api/training-sessions", body(stage_id, "09:00"), format="json").data
        res = trainer.patch(f"/api/training-sessions/{third['TrainingSessionID']}",
                            {"WorkRiderID": self.rider2.id, "RiderChangeReason": "An ốm"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        removed = self.notes(self.rider, "RIDER_REMOVED")
        self.assertIn(third["TrainingSessionID"], [n["EntityID"] for n in removed])
        self.assertIn(third["TrainingSessionID"], [n["EntityID"] for n in self.notes(self.head, "RIDER_CHANGED")])

    def test_only_head_trainer_changes_main_rider(self):
        horse_id, stage_id = self.ready_with_main_rider()
        put = {"WorkRiderID": self.rider2.id}
        self.assertEqual(self.client_for(self.trainer).put(f"/api/horses/{horse_id}/main-work-rider", put,
                                                           format="json").status_code, 403)
        res = self.client_for(self.head).put(f"/api/horses/{horse_id}/main-work-rider", put, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        prefs = self.client_for(self.head).get(f"/api/horses/{horse_id}/work-rider-preferences").data
        self.assertEqual([(p["WorkRiderID"], p["Priority"]) for p in prefs], [(self.rider2.id, 1)])
        created = self.client_for(self.trainer).post("/api/training-sessions", body(stage_id), format="json")
        self.assertEqual(created.data["WorkRiderID"], self.rider2.id)

    def test_horse_without_main_rider_needs_choice(self):
        horse_id, plan, stage_id = self.ready_horse()
        res = self.client_for(self.trainer).post("/api/training-sessions", body(stage_id), format="json")
        self.assertIn("WorkRiderID", res.data)

    def test_rider_list_and_specializations(self):
        horse_id, stage_id = self.ready_with_main_rider()
        head, trainer = self.client_for(self.head), self.client_for(self.trainer)
        self.assertEqual(trainer.post(f"/api/work-riders/{self.rider2.id}/specializations",
                                      {"SpecializationID": self.flat.id}, format="json").status_code, 403)
        res = head.post(f"/api/work-riders/{self.rider2.id}/specializations", {"SpecializationID": self.flat.id},
                        format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["Specializations"][0]["SpecializationID"], self.flat.id)
        self.assertEqual(head.post(f"/api/work-riders/{self.rider2.id}/specializations",
                                   {"SpecializationID": self.flat.id}, format="json").data["code"], "ALREADY_EXISTS")
        trainer.post("/api/training-sessions", body(stage_id), format="json")
        rows = trainer.get(f"/api/work-riders?HorseID={horse_id}&Date={TODAY.isoformat()}&StartTime=06:15").data
        self.assertEqual([r["UserID"] for r in rows], [self.rider.id, self.rider2.id])
        main, other = rows
        self.assertTrue(main["IsMainRider"] and main["IsBusy"])
        self.assertTrue(other["MatchesSpecialization"] and not other["IsBusy"])
        self.assertEqual(head.delete(f"/api/work-riders/{self.rider2.id}/specializations/{self.flat.id}")
                         .status_code, 204)
        self.assertFalse(WorkRiderSpecialization.objects.filter(work_rider=self.rider2).exists())


class SubstituteTests(TrainingTestCase):
    def test_head_trainer_picks_substitute_for_the_day(self):
        horse_id, plan, stage_id = self.ready_horse()
        first = self.session(stage_id)["TrainingSessionID"]
        second = self.session(stage_id)["TrainingSessionID"]
        head = self.client_for(self.head)
        suggestions = head.get(f"/api/training-sessions/{first}/substitute-suggestions").data
        self.assertEqual(suggestions[0]["UserID"], self.trainer2.id)       # cùng chuyên môn Flat trước
        self.assertTrue(suggestions[0]["MatchesSpecialization"])
        self.assertIn(self.head.id, [r["UserID"] for r in suggestions])  # khác chuyên môn vẫn chọn được
        self.assertEqual(self.client_for(self.trainer).get(
            f"/api/training-sessions/{first}/substitute-suggestions").status_code, 403)
        res = head.post("/api/training-sessions/substitute-day", {
            "TrainerID": self.trainer.id, "Date": TODAY.isoformat(), "SubstituteTrainerID": self.trainer2.id,
            "Reason": "Trainer nghỉ phép"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(sorted(s["TrainingSessionID"] for s in res.data), sorted([first, second]))
        notes = {(n["Type"], n["EntityID"]) for n in self.client_for(self.trainer2).get("/api/notifications").data}
        self.assertIn(("SUBSTITUTE_ASSIGNED", first), notes)
        notes = {(n["Type"], n["EntityID"]) for n in self.client_for(self.trainer).get("/api/notifications").data}
        self.assertIn(("SUBSTITUTE_SET", second), notes)
        # người giám sát thay đổi được kỵ sĩ / giờ, không đổi nội dung buổi tập
        sub = self.client_for(self.trainer2)
        res = sub.patch(f"/api/training-sessions/{first}", {"WorkRiderID": self.rider2.id}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(sub.patch(f"/api/training-sessions/{first}", {"TrainingType": "Gallop"},
                                   format="json").status_code, 403)
        self.assertEqual(sub.patch(f"/api/training-sessions/{first}", {"SubstituteTrainerID": self.head.id},
                                   format="json").status_code, 403)


class StageSummaryToHeadTests(TrainingTestCase):
    def test_head_trainer_receives_stage_summary(self):
        horse_id, plan, stage_id = self.ready_horse()
        sid = self.session(stage_id)["TrainingSessionID"]
        self.client_for(self.rider).post(f"/api/training-sessions/{sid}/start")
        self.client_for(self.rider).post(f"/api/training-sessions/{sid}/result", {"ActualDistanceKm": 3},
                                         format="json")
        mail.outbox.clear()
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client_for(self.trainer).post(f"/api/training-plan-stages/{stage_id}/close",
                                                     {"SummaryNote": "Ngựa thích nghi tốt"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        to_head = [m for m in mail.outbox if self.head.email in m.to]
        self.assertTrue(to_head and "Tổng kết giai đoạn" in to_head[0].subject)
        notes = [n for n in self.client_for(self.head).get("/api/notifications").data if n["Type"] == "STAGE_SUMMARY"]
        self.assertEqual(notes[0]["Message"], "Ngựa thích nghi tốt")
        self.assertEqual(notes[0]["HorseID"], horse_id)
