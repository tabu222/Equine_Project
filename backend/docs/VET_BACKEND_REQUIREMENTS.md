# Veterinarian — đối chiếu source và yêu cầu còn thiếu

> Cập nhật mới nhất: [bàn giao và đối chiếu source ngày 22/10/2026](VET_WORKSPACE_20261022.md). Các mục dưới là lịch sử đánh giá ngày 18/10; cần đối chiếu tài liệu mới, đặc biệt về lịch, thuốc, thao tác sau chốt và giới hạn quy tắc khóa tập. Không dùng ghi chú lịch sử để kết luận API hiện tại còn thiếu.

Ngày rà soát: 18/10/2026. Phạm vi: source BE/FE hiện có trong repository. Không sửa BE, schema hoặc dữ liệu SQL Server trong lần tích hợp này. Tài liệu này được yêu cầu trực tiếp bởi prompt đính kèm.

Đã đọc đầy đủ `Gop_y.docx` do người dùng bổ sung tại `C:\Users\R9000P 2022\Downloads\Gop_y.docx` và đối chiếu các mục 2, 3, 4, 5, 6 với source. File không có ảnh nhúng; ảnh giao diện riêng và asset giải phẫu vẫn chưa được cung cấp. README gốc mô tả bản tích hợp Flow 1 cũ; đánh giá dưới đây căn cứ vào source thực tế vừa pull.

`Gop_y.docx` là tài liệu góp ý, gồm cả đề xuất và câu hỏi cần hỏi thầy, không phải biên bản phê duyệt tất cả nghiệp vụ. Phạm vi thực hiện theo prompt của người dùng và contract source hiện có. Các đoạn SQL trong tài liệu chỉ được đối chiếu với schema, không được chạy vào database. Những ý còn chờ chốt được tách riêng ở mục 1.1 dưới đây.

## 1. Bảng khả năng trước và sau tích hợp

| Chức năng | FE trước thay đổi | BE/API thực tế và bằng chứng | Đánh giá | Thực hiện / việc còn lại |
|---|---|---|---|---|
| Hàng chờ khám đầu vào | Có tìm/lọc, nháp, kết quả, xử lý lỗi cạnh tranh | `medical/views.py:PendingInitialExamView`, `services.py:create_record/ensure_draft_owner/sign_record`; `/vet/pending-initial-exams`, `/horses/{id}/medical-records` | Một phần | Giữ luồng Vet trực tiếp khám, liên kết RegistrationRequest, Manager tiếp nhận; còn VET-01 |
| Bệnh án Draft/Signed/đính chính | Có, gồm API đính chính | `medical/services.py:update_record/sign_record/add_amendment`, `models.py:MedicalRecordAmendment` | Một phần | Giữ bản gốc và đính chính; còn cạnh tranh cập nhật/chốt VET-02 |
| Tổng quan sức khỏe | Có, tải hết danh sách; phần Flow 3 báo chưa khả dụng | `/horses`, `/training-locks`, `/health-reports`, `/vaccinations`, `/medical-schedules`; tất cả lọc CLB trong views | Một phần | Nối công việc khẩn, khóa thật, lịch thật; không dùng 0 khi lỗi; còn tổng hợp quy mô lớn VET-10 |
| Chuồng và ngựa chưa xếp | Có lưới, chưa có khu/vị trí | `horses/models.py:Stall/StallAssignment`, `horses/views.py`; `/stalls` trả CurrentHorse | Một phần | Thêm nhãn khóa thật, giữ trạng thái lỗi riêng; còn VET-09 |
| Khám ngựa đã tiếp nhận | Chỉ hỗ trợ form đầu vào | `medical/models.py:MedicalRecord.ExamType`, `services.py:create_record/check_session/check_report_for_record`; tạo và chốt phiếu dùng cùng API | Một phần | Mở form định kỳ/chấn thương/tái khám/cấp cứu, tiếp tục nháp theo ID, xem phiếu đã chốt |
| Đơn thuốc | Placeholder | `services.py:add_treatment/update_treatment`, `views.py:RecordTreatmentView/HorseTreatmentView`; tạo thuốc chỉ nháp chính chủ | Một phần | Nối xem và kê thuốc trên nháp; liều kèm đơn vị do Vet nhập, tần suất ở Note; còn VET-08 |
| Khóa / hạn chế tập | Nút vô hiệu hóa | `medical/services.py:create_lock/update_lock/release_lock`; `training/services.py:check_session_lock/check_plan_lock`; trigger SQL | Một phần | Nối tạo/sửa/mở khóa, hiển thị CancelledSessionIDs; còn VET-03/04 |
| Báo cáo sức khỏe | Placeholder | `medical/views.py:HealthReport*`, `services.py:take_report/link_report_to_record/resolve_report`; phân quyền HEALTH_REPORT/MEDICAL_MANAGE | Một phần | Nối nhận, ghi diễn biến, lập phiếu gắn báo cáo, khóa, kết luận xử lý; còn VET-05 |
| Tiêm phòng/lịch y tế | Chỉ mốc FollowUpDate trên phiếu | `models.py:Vaccination/MedicalSchedule`, `services.py:save_vaccination/save_schedule`; đọc/tạo/sửa API thật | Một phần | Nối đọc, lọc, nhóm ngày, tạo và hủy; không ghi hoàn thành giả; còn VET-06 |
| Nhắc hạn trong ứng dụng | Chưa tích hợp tại trang Vet | `medical/notifications.py:medical_items`, `core/notifications.py`, GET `/notifications`: tính lúc đọc | Một phần | Thông báo hiện có giữ nguyên; chưa phải worker tự động, còn VET-07 |
| Chấn thương 3D/phục hồi | Mô tả chữ và placeholder | MedicalRecord chỉ có InjuryLocation; không có model injury/marker, file 3D hoặc thư viện 3D trong package.json/public | Thiếu | Giữ hiển thị chữ và vô hiệu hóa tạo dấu; còn VET-11 |
| CareIncidents / HealthReports | Báo cáo sức khỏe từng là placeholder | Không có app care; đã có HealthReport/HealthReportNote nhận báo cáo từ Groom, Work Rider, Trainer, Head Trainer | Đã có cấu trúc tương đương tài liệu mục 3.4; luồng xử lý còn một phần | Tài liệu cho phép đổi CareIncidents thành HealthReports; dùng HealthReport hiện có, không yêu cầu thêm bảng báo cáo trùng; chăm sóc khác ngoài phạm vi |

Đường dẫn BE trong bảng tương đối với `backend/apps/`. FE: `frontend/src/pages/vet/{VetWorkspace,VetMedicalProfile,VetExaminationForm,HorsesNeedingExam,VetOperations}.jsx/tsx`, `frontend/src/api/{horseApi,vetApi}.ts`. Routing/auth: `frontend/src/App.jsx`, `api/apiClient.ts`; quyền thật ở `backend/apps/accounts/rbac.py`, `apps/core/permissions.py`.

### 1.1. Đối chiếu bổ sung với Gop_y.docx

| Nội dung tài liệu | Đối chiếu prompt/source và kết luận áp dụng |
|---|---|
| Mục 2, 3.2: mọi Vet trong CLB xem tiền sử; nhận khám đầu vào theo ca trực, không cần Manager chỉ định | Prompt người dùng yêu cầu rõ cách này; source có hàng chờ chung, kiểm tra quyền/CLB và ownership nháp. Giữ luồng đã triển khai; chưa có module quản lý lịch trực nên không suy ra bác sĩ nào đang trực từ role Vet. |
| Mục 3.3: unique index một lần khám đầu vào trên mỗi RegistrationRequest | Source SQL dùng tên bảng số ít `MedicalRecord`, index `UX_MedicalRecord_OneInitialExamPerRequest`; liên kết và index đã có trong script. Không chạy lại SQL bảng số nhiều trong tài liệu. Unique index ngăn bản ghi trùng khi lưu, chưa thay claim nguyên tử: VET-01 vẫn cần xử lý. |
| Mục 3.2–3.3: Draft chỉ người lập sửa; Signed giữ nguyên, thêm đính chính và SignedAt | Source đã có các trạng thái, thời điểm chốt, VetID và MedicalRecordAmendment; FE dùng cơ chế đó. VET-02 tập trung cạnh tranh PATCH/sign, không coi toàn bộ chức năng chốt/đính chính là thiếu. Tài liệu dùng từ “ký (chốt)” không chứng minh có chữ ký số. |
| Mục 2, 3.2, 5: tách HealthStatus/TrainingEligibility; Full/Restricted, mọi Vet được mở sau tái khám đạt | Phù hợp prompt và enum source. Đã nối FE; giới hạn cường độ dùng MaxIntensity theo TrainingLoad. Chỉ dẫn bằng chữ về loại bài/cự ly/thời hạn chưa thành ràng buộc tự động: VET-03/04 còn hiệu lực; các ví dụ trong tài liệu không phải chỉ định áp sẵn cho ngựa. |
| Mục 3.4: CareIncidents có thể đổi tên HealthReports; báo một lần để Vet/Trainer/Head Trainer cùng nhận thông tin | Source đã chọn HealthReport, có Severity, TrainingSessionID, MedicalRecordID, người báo và Notes; `medical/notifications.py` tổng hợp thông báo theo quyền. Không tạo thêm CareIncident hoặc bước cấp trên duyệt trước khi đến Vet. Khả năng claim/link/resolve đồng thời còn VET-01/05. |
| Mục 3.4: Urgent trong buổi tập thì Work Rider dừng buổi, chuyển Cancelled | Source `create_health_report` tự stop session In Progress khi báo Urgent có gắn session; khác biệt về tác nhân thao tác cần nghiệp vụ chốt. FE Vet không tự mở rộng thành quy tắc mọi khóa đều dừng buổi đang tập. Phần này được theo dõi tại VET-04. |
| Mục 3.3 và câu hỏi 6.B: thuốc và thời gian ngưng thuốc có thể để giai đoạn sau | Prompt người dùng đã yêu cầu phần điều trị/đơn thuốc, source có Treatment và validation, nên việc nối xem/thêm thuốc vào nháp thuộc phạm vi đã giao. Không tự kê liều hoặc đặt thời gian ngưng thuốc từ các ví dụ; giới hạn dữ liệu có cấu trúc và audit ở VET-08. |
| Mục 2 và câu hỏi 6.B: Vaccination/MedicalSchedule có thể do bác sĩ ngoài thực hiện, VetID nullable; có cấp tài khoản hay không chưa chốt | Source hỗ trợ ExternalVet cho hai resource lịch/tiêm phòng, không có nghĩa MedicalRecord.VetID nullable hoặc đã có workflow tài khoản bác sĩ ngoài. FE đang đặt lịch bằng tài khoản Vet đăng nhập; cần chốt cách chọn/định danh người thực hiện ngoài trước khi bổ sung workflow này. |
| Mục 4.1 và câu hỏi 6.A: Owner đăng ký, Manager xác minh/duyệt/cấp mã/xếp chuồng; tiếp nhận ngựa khám không đạt còn là câu hỏi | Source/prompt đã có phân quyền và chuỗi tiếp nhận này. Vet chốt kết luận, không tự duyệt hoặc tự từ chối tiếp nhận. Không sửa chính sách Manager tiếp nhận ngựa không đạt trong lần nâng cấp Vet. |
| Mục 6.B: Owner xem bệnh án chi tiết hay chỉ tóm tắt | Tài liệu chưa chốt. Nâng cấp Vet không mở rộng quyền Owner hoặc tính công khai tài liệu/ảnh y tế; phải xác nhận trước khi thay đổi phân quyền ở BE. |
| Mục 5, 6.C: Head Trainer duyệt giáo án, giao việc chăm sóc và yêu cầu vật tư còn cần xác nhận | Không nằm trong phạm vi giao diện Vet lần này. Đối chiếu tích hợp khóa với source huấn luyện thực tế; không tự sửa Flow 2/4 theo các đề xuất này. |
| Tổng quan toàn đàn, lưới chuồng, lịch có trạng thái hoàn thành, nhắc tự động và chấn thương 3D | Đây là yêu cầu của prompt người dùng; `Gop_y.docx` không mô tả đầy đủ các chức năng này, không có mô hình cơ/xương hoặc tọa độ marker. VET-06/07/09/10/11 xuất phát từ đối chiếu prompt với source, không gán thành quyết định đã được tài liệu góp ý xác nhận. |

Các điểm cần chốt tiếp: tài khoản/định danh bác sĩ ngoài; phạm vi bệnh án Owner được đọc; tiếp nhận ngựa đầu vào không đạt; giới hạn loại bài/cự ly và đơn vị tải; cách chuyển ca; tác nhân dừng buổi tập khi có báo cáo khẩn. Những vấn đề này không phủ định các chức năng đã được prompt giao và source hỗ trợ, nhưng cần quyết định rõ trước khi đổi chính sách hiện hành. Việc giáo án có bước duyệt, chuyển nhượng ngựa và chức năng chăm sóc/vật tư được giữ ngoài phạm vi nâng cấp Vet.

## 2. Contract đang nối (đã tồn tại, không phải đề xuất)

URL dưới đây tương đối `/api`; JSON giữ tên cột BE. ID số nguyên trên wire; FE chuẩn hóa ID ngựa/user thành chuỗi. Hiện các list medical trả mảng không phân trang. Adapter dùng chung có thể theo `count/results/next` cùng origin/resource, từ chối thiếu trang; không tính tổng đàn từ một trang. Endpoint authorization và phạm vi CLB do BE kiểm tra.

| API | Payload / response tiêu biểu |
|---|---|
| GET `/horses`, GET `/stalls` | HorseID, ClubID, CurrentHealthStatus; StallID, ClubID, StallNumber, CurrentHorse |
| GET `/vet/pending-initial-exams` | RegistrationRequestID, RequestDate, WaitingHours, DraftMedicalRecordID, DraftVetID |
| GET/POST `/horses/{horse}/medical-records`, PATCH `/medical-records/{id}` | `{ "ExamType":"Follow-up", "ExamDate":"2026-10-18T09:12:45", "HealthReportID":12, "WeightKg":480.5, "HeightCm":162.0, "Symptoms":"…", "Diagnosis":"…", "Conclusion":"…", "HealthStatus":"Healthy", "TrainingEligibility":"Eligible", "FollowUpDate":"2026-10-25" }`; HealthReportID chỉ khi tạo, WeightKg kg, HeightCm cm |
| POST `/medical-records/{id}/sign` | `{}`; trả phiếu, SignedAt, TrainingLock nullable; Not Eligible trên ngựa Approved tự tạo/nâng Full |
| GET/POST `/medical-records/{id}/amendments` | `{ "Reason":"…", "AmendedContent":"…" }`; trả author/time và bản ghi nối tiếp |
| GET `/horses/{horse}/treatments`, POST `/medical-records/{id}/treatments` | `{ "MedicineName":"Do Vet nhập", "Dose":"Liều kèm đơn vị do Vet nhập", "Route":"Oral", "StartDate":"2026-10-18", "EndDate":null, "WithdrawalUntil":null, "Note":"Tần suất/hướng dẫn do Vet nhập" }` |
| GET `/training-locks?HorseID=&LockStatus=Active`, POST `/horses/{horse}/training-locks`, PATCH `/training-locks/{id}` | `{ "Reason":"Lý do do Vet nhập", "LockLevel":"Restricted", "MaxIntensity":20.00, "Details":"…" }`; response TrainingLockID, CreatedByVetID, CreatedByName, LockStartDate, CancelledSessionIDs (create/update) |
| POST `/training-locks/{id}/release` | `{ "Note":"Kết luận/lý do mở khóa do Vet nhập" }`; BE tìm phiếu đã chốt sau khóa, trả ReleasedByVetID/ReleasedAt |
| GET `/health-reports`, POST `/health-reports/{id}/take`, POST `/health-reports/{id}/notes`, POST `/health-reports/{id}/resolve` | Nhận `{}`; diễn biến `{ "Content":"…" }`; hoàn tất `{ "VetNote":"Kết luận xử lý thực tế" }`; trả ReportedByName, ReportedByRoles, ReportedAt, Severity, Description, ImageUrl, TrainingSessionID, Status, VetID, MedicalRecordID, Notes |
| GET `/vaccinations`, POST `/horses/{horse}/vaccinations`, PATCH `/vaccinations/{id}` | Tạo `{ "VaccineName":"Do Vet nhập", "VaccinationDate":"2026-10-25", "Status":"Scheduled", "Note":"…" }`; hủy `{ "Status":"Cancelled" }` |
| GET `/medical-schedules`, POST `/horses/{horse}/medical-schedules`, PATCH `/medical-schedules/{id}` | Tạo `{ "ScheduleType":"Farrier", "ScheduledDate":"2026-10-25", "Status":"Scheduled", "Note":"…" }`; hủy `{ "Status":"Cancelled" }` |

Thời gian: BE `config/settings.py` dùng `TIME_ZONE=Asia/Ho_Chi_Minh`, `USE_TZ=False`, DATETIME2 local UTC+07:00; FE chuyển theo giờ CLB, giữ giây. Date-only `YYYY-MM-DD` so theo ngày CLB, không parse thành UTC midnight của trình duyệt. Enum thật: Healthy/Monitor/Injured/Recovering/Isolated; Eligible/Restricted/Not Eligible; Draft/Signed; Full/Restricted; Active/Released; Reported/Reviewing/Resolved; Urgent/Normal; Scheduled/Completed/Overdue/Cancelled. Mapping FE cũ `ELIGIBLE` chỉ nghĩa Healthy, **không** suy ra Eligible về tập; INJURED không tự suy ra cách ly.

FE không thêm ngày kết thúc cho khóa mới: áp dụng ngay, không hết hạn tự động ở FE. Khóa cũ có LockEndDate được hiển thị để Vet đối chiếu. Quy tắc BE về hiệu lực theo ngày vẫn còn gap VET-03.

## 3. Quy ước chung cho các API đề xuất

**Tất cả API trong mục 4 là đề xuất, chưa được FE gọi.** Tái sử dụng bảng hiện có khi phù hợp; không tạo bản sao Vaccination/MedicalSchedule/HealthReport.

- Quyền: đọc HORSE_VIEW; sửa bệnh án MEDICAL_MANAGE; chốt MEDICAL_SIGN; khóa TRAINING_LOCK_MANAGE. User phải Active, cùng CLB ngựa; Vet ngoài CLB nhận 404, không tiết lộ dữ liệu. Không nhận ClubID/VetID do client giả mạo.
- ID integer; UUID cho Idempotency-Key; revision integer tăng dần. Datetime mới có offset RFC3339 (ví dụ `2026-10-18T09:12:45+07:00`); cần chuyển đổi tương thích DATETIME2 hiện có. Date là YYYY-MM-DD; decimal xác định precision/đơn vị. Giữ contract cũ cho Flow 1.
- List đề xuất: `?page=1&page_size=50`, `{"count":1,"next":null,"previous":null,"results":[...]}`, thứ tự ổn định theo thời gian và ID. Stats là aggregate CLB từ BE, có `asOf`, không lấy số đếm một trang.
- Lỗi nghiệp vụ dùng 409 + code ổn định; validation 400 theo field; không trả lỗi SQL/stack trace. Ghi audit actor/club/entity/old/new/reason/time/request-id, giới hạn ai xem dữ liệu y tế.
- Mutation cần transaction và khóa hàng chung theo ngựa; xử lý deadlock có giới hạn; cùng Idempotency-Key/payload trả cùng kết quả, khác payload trả 409; unique constraint là lớp cuối, không thay cơ chế đồng thời.

## 4. Các gap cụ thể

### VET-01 — Nhận khám đồng thời và thời điểm vào hàng chờ — P0

**Một phần.** `medical/services.py:create_record` kiểm tra `.exists()` rồi create; `take_report` check trạng thái rồi save, không thấy `select_for_update` hoặc compare-and-swap. SQL `UX_MedicalRecord_OneInitialExamPerRequest`/`UX_TrainingLock_OneActivePerHorse` là bảo vệ cuối, không chứng minh đã có claim nguyên tử. `PendingInitialExamView` dùng RequestDate của đăng ký; chưa có mốc riêng lúc chuyển PendingExam. `config/settings.py:ATOMIC_REQUESTS=True` chỉ bao transaction, không tự serialize hai request đọc cùng phiên bản.

Tái sử dụng RegistrationRequest/MedicalRecord/HealthReport; thêm ClaimedByVetID/ClaimedAt/Revision và PendingExamAt. **Đề xuất** POST `/registration-requests/{id}/claim-exam` `{ "expectedRevision":3 }` → `{ "recordId":41,"vetId":7,"claimedAt":"2026-10-18T09:12:45+07:00","revision":4 }`; POST `/health-reports/{id}/take` bổ sung revision tương tự. Chỉ Vet CLB, claim lại cùng người là idempotent; PendingExam → Draft, Reported → Reviewing. Audit nhận/chuyển ca. Không thêm Manager chỉ định. Flow 1 giữ RegistrationRequestID, không duyệt tiếp nhận khi nhận/chốt khám. Nghiệm thu: hai Vet gửi đồng thời chỉ một người thắng, người thua 409 có trạng thái mới; không có hai phiếu cho một lần đăng ký; thời gian chờ lấy PendingExamAt.

### VET-02 — Chốt/đính chính khi có cập nhật đồng thời — P0

**Một phần.** BE đã chặn sửa/chốt nháp khác chủ, chặn PATCH phiếu Signed, lưu SignedAt và VetID, append MedicalRecordAmendment. Nhưng `update_record/sign_record` thao tác instance đọc trước, chưa khóa/revision; chưa kiểm chứng một PATCH đang chạy đồng thời với sign không ghi đè Signed. Không có chữ ký số; giao diện chỉ gọi “chốt phiếu”.

Thêm Revision; snapshot phiếu/thuốc khi chốt. **Đề xuất** PATCH `/medical-records/{id}` `{ "Revision":5,"Diagnosis":"Do Vet nhập" }`; POST `/medical-records/{id}/sign` `{ "Revision":6 }` → `{ "MedicalRecordID":41,"RecordStatus":"Signed","SignedByVetID":7,"SignedAt":"2026-10-18T09:12:45+07:00","Revision":7 }`. Khóa record + thuốc trong transaction; chỉ người lập sửa/chốt nháp, MEDICAL_SIGN mới chốt; Signed chỉ append amendment (API hiện có) với reason/content/actor/time, không đổi bản gốc. Audit toàn bộ thay đổi; không biến đính chính thành tái khám/mở khóa. Flow 1: chốt không approve horse. Nghiệm thu: race PATCH/sign trả một kết quả tuần tự hợp lệ, snapshot Signed không bị mất/đổi; người ngoài CLB không đọc/chốt/đính chính; reload giữ bản gốc và lịch sử.

### VET-03 — Hiệu lực khóa và đồng bộ kết luận — P0

**Một phần, có chặn ở BE.** `training/services.py:check_session_lock` gọi `TrainingLock.covers` xét cả LockEndDate; SQL `TRG_TrainingSession_BlockLockedHorse` cũng xét khoảng ngày. Vì thế khóa Active có ngày kết thúc dự kiến trong quá khứ không chặn ngày sau đó dù chưa mở. `release_lock` cần phiếu Signed sau khóa nhưng chấp nhận bất kỳ ExamType không Not Eligible, không bắt buộc Note; không kiểm tra Restricted còn cần giới hạn mới. `lock_after_sign` không tự áp giới hạn khi kết luận Restricted, không tự giải quyết mâu thuẫn giữa kết luận Eligible và lock Full. Không có trường TrainingEligibility hiện hành riêng ở Horse.

Tái sử dụng TrainingLock; tách ExpectedReviewDate/ExpectedEndDate (dự kiến) khỏi ReleasedAt (mở thật); thêm MedicalRecordID/ReleaseMedicalRecordID/ReleaseReason và snapshot hạn chế. **Đề xuất** POST `/horses/{horse}/training-locks` `{ "LockLevel":"Restricted","Reason":"…","MaxTrainingLoad":20.00,"ExpectedReviewDate":"2026-10-25","MedicalRecordID":41 }` → `{ "TrainingLockID":8,"effectiveEligibility":"Restricted","revision":2,"affectedSessions":[] }`; POST `/training-locks/{id}/release` `{ "MedicalRecordID":44,"Reason":"…","revision":2 }` → `{ "LockStatus":"Released","ReleasedByVetID":7,"ReleasedAt":"2026-10-25T09:00:00+07:00" }`. Xác nhận đơn vị TrainingLoad với team nghiệp vụ trước khi quy đổi, không gọi nó là km/phút/bpm.

Active chặn cho tới explicit release; tái khám phải Signed sau khóa, cùng ngựa và kết luận hợp lệ; Restricted cần giới hạn có cấu trúc. Transaction đồng bộ sức khỏe, kết luận tập và khóa theo quy tắc được xác nhận; không suy sức khỏe từ lock. Mọi Vet có quyền cùng CLB có thể mở. Audit lý do, người tạo/mở, record liên quan; ảnh hưởng trực tiếp Flow 2. Nghiệm thu: khóa quá ngày dự kiến vẫn chặn, không tự mở bằng Eligible hoặc client clock; mở thiếu lý do/tái khám bị chặn; Restricted không trở thành không giới hạn sau release.

### VET-04 — Khóa/xếp lịch đồng thời và buổi đang tập — P0

**Một phần.** `medical/services.py:_cancel_sessions_for_lock` hủy Assigned, trả CancelledSessionIDs; `training/services.py:_validate_session/create_session/update_session/start_session` kiểm tra khóa khi tạo, sửa và start. SQL có trigger block/cancel. Chưa thấy khóa hàng chung serialize lock với xếp/start; khóa mới không xử lý In Progress. Urgent report gắn session có thể stop trong `create_health_report`, nhưng đây không phải chính sách chung khi khóa.

Tái sử dụng TrainingSession, giữ trạng thái Cancelled và audit, không xóa. **Đề xuất** lock response `{ "TrainingLockID":8,"cancelledSessionIds":[12],"inProgressSessionIds":[13],"requiresReviewSessionIds":[],"revision":3 }`; request có optional `{ "expectedHorseRevision":9 }`. Khóa hàng Horse chung trong create/update/start session và create/update/release lock; kiểm tra Full/Restricted/TrainingLoad thiếu/vượt giới hạn. Giới hạn bài tập/cự ly nếu cần thêm enum ExerciseType và MaxDistanceMeters number ≥0, không parse free text. Quyết định dừng buổi đang tập cần nghiệp vụ xác nhận, hiện FE không khẳng định đã dừng buổi đó. Audit từng session bị hủy/hoãn/stop, trả rõ kết quả. Nghiệm thu: test hai connection lock-vs-start/schedule trên SQL Server; không có Assigned/In Progress trái khóa, lịch sử và lý do còn sau reload.

### VET-05 — Báo cáo liên kết bệnh án, claim và kết thúc — P1

**Một phần.** Đã có HealthReport.MedicalRecordID, Notes, báo cáo từ Groom/Work Rider/Trainer/Head Trainer, Vet nhận, liên kết cùng ngựa khi tạo phiếu; thông báo cho Vet/Trainer liên quan/Head Trainer trong `medical/notifications.py`. Tuy nhiên check/link có thể race; `resolve_report` có thể gắn phiếu nháp hoặc phiếu đã gắn báo cáo khác, bất kỳ Vet có MEDICAL_MANAGE có thể sửa/resolve dù Vet khác đã nhận; reason-only resolve được phép. FE giữ thao tác hoàn tất rõ ràng, không đóng khi xem và chỉ hiển thị cho Vet nhận ca.

Tái sử dụng HealthReport/MedicalRecord/HealthReportNote, thêm Revision/ResolvedByVetID/ResolutionType và ràng buộc liên kết. **Đề xuất** POST `/health-reports/{id}/resolve` `{ "Revision":4,"MedicalRecordID":41,"ResolutionType":"ExamCompleted","VetNote":"…" }` → `{ "Status":"Resolved","MedicalRecordID":41,"ResolvedByVetID":7,"ResolvedAt":"2026-10-18T09:12:45+07:00","Revision":5 }`. Enum ResolutionType ExamCompleted/AdviceOnly cần nghiệp vụ xác nhận; ExamCompleted bắt buộc phiếu Signed, AdviceOnly bắt buộc lý do. Claim/link/resolve transaction, 409 khi đã xử lý hoặc liên kết trùng; same-horse/same-club trên mọi liên kết; cần quy tắc bàn giao ca giữa Vet. Audit report/record/session/actor/time; ảnh hưởng chăm sóc và huấn luyện. Nghiệm thu: hai Vet không claim hoặc lập hai phiếu cho một report; xem không đổi trạng thái; đóng đúng điều kiện, người ngoài CLB không biết report tồn tại.

### VET-06 — Hoàn thành lịch, tái khám và tránh hai bản ghi — P1

**Một phần.** MedicalSchedule chỉ có ScheduledDate/Status/Note; Vaccination có VaccinationDate/NextDueDate/Status nhưng không tách planned/actual, không có kết quả/CompletionID hoặc liên kết schedule-vaccination. ScheduleType chưa có Follow-up. `save_schedule` cho thay status không kiểm tra transition/kết quả; có thể tồn tại hai bản ghi Vaccination và ScheduleType Vaccination cho cùng một lần tiêm. Vì vậy FE hiện tạo tiêm phòng qua Vaccination, không tạo MedicalSchedule loại Vaccination, không cho hoàn thành thiếu dữ liệu.

Thêm ActualPerformedAt, Result, CompletedByVetID, FollowUpMedicalRecordID, nullable NextDueDate và VaccinationID liên kết duy nhất; quyết định NextDueDate chỉ là mốc hay sinh lịch mới phải rõ ràng. **Đề xuất** POST `/medical-schedules/{id}/complete` `{ "ActualPerformedAt":"2026-10-18T09:12:45+07:00","Result":"Do Vet nhập","NextDueDate":null,"Revision":2 }` → `{ "MedicalScheduleID":9,"Status":"Completed","CompletionID":18,"VaccinationID":null,"nextScheduleId":null,"Revision":3 }`; cùng cấu trúc cho `/vaccinations/{id}/complete`. ScheduleType enum bổ sung Follow-up, lấy chỉ định từ Signed record, không tự tính chu kỳ. Scheduled/Overdue → Completed hoặc Cancelled; Completed không sửa đè kết quả, cần correction audit. Vet CLB, actual không tương lai, ngày chỉ định/next hợp lệ, transaction/idempotency chống complete hai lần; một lần tiêm chỉ có một thực hiện. Không tự tạo SMS/email. Nghiệm thu: planned date không mất, actual/result/next/actor còn sau reload; hoàn tất đồng thời không sinh trùng; ngày hết hạn chính xác qua 00:00 CLB.

### VET-07 — Nhắc việc tự động, bền vững và chống trùng — P1

**Thiếu tự động; có nhắc hạn khi đọc.** `medical/notifications.py:medical_items` tổng hợp lịch Scheduled đến 7 ngày khi GET `/notifications`; không có command/worker/scheduler, rule, persisted notification hoặc dedup record cho nhắc y tế. `owner_emails.py` là email theo sự kiện, không thay worker nhắc y tế.

Thêm MedicalReminderRule, ReminderDelivery/Notification với unique `(club,resource_type,resource_id,rule_id,occurrence,recipient)`, event outbox cùng transaction. **Đề xuất** GET `/medical-reminder-rules` → pagination `{ "results":[{"id":1,"leadDays":3,"channel":"InApp","enabled":true}],"count":1,"next":null,"previous":null }`; nội bộ job `enqueue_due_medical_reminders(asOf)` nhận ISO offset, không mở public endpoint chạy job cho Vet. GET `/notifications` tiếp tục trả thông báo; thêm ReadAt theo user nếu cần. Rule leadDays integer≥0; lịch Completed/Cancelled không gửi, retry idempotent, ngựa/recipient cùng CLB. Audit enqueue/delivery/read/failure, tránh ghi nội dung nhạy cảm không cần thiết. Ảnh hưởng lịch chăm sóc, không thay Flow 1; không tự mở SMS/email. Nghiệm thu: job chạy hai lần vẫn một thông báo/mốc/người, hoạt động khi không mở FE, kiểm thử midnight/retry/rule đổi và quyền CLB.

### VET-08 — Thuốc có đơn vị/tần suất cấu trúc và audit sau chốt — P2

**Một phần.** `Treatment` lưu Dose chuỗi và Note, không có trường Frequency/DoseUnit riêng. Route có enum; ngày dùng/ngưng và kiểm tra thứ tự đã có. `update_treatment` vẫn cho đổi EndDate/WithdrawalUntil sau Signed, nên không được tuyên bố toàn bộ thuốc Signed bất biến. FE lần này chỉ thêm thuốc trên nháp chính chủ, không sửa thuốc Signed.

Tái sử dụng Treatment; thêm DoseValue decimal nullable/DoseUnit string/Frequency string, không tự đổi liều cũ; xác nhận bảng đơn vị chuyên môn trước khi bắt buộc. **Đề xuất** POST `/medical-records/{id}/treatments` `{ "MedicineName":"Do Vet nhập","DoseValue":null,"DoseUnit":null,"DoseText":"Do Vet nhập","Route":"Oral","Frequency":"Do Vet nhập","StartDate":"2026-10-18","EndDate":null,"WithdrawalUntil":null }` → `{ "TreatmentID":21,"Revision":1 }`; POST `/treatments/{id}/amendments` `{ "Reason":"…","EndDate":"2026-10-20","WithdrawalUntil":"2026-10-30","Revision":1 }` → amendment author/time. Draft owner-only, Signed append event/snapshot, validates units/dates/length, transaction with sign, immutable audit. Ảnh hưởng chăm sóc và thi đấu; không tự kê thuốc hay ngưng thuốc. Nghiệm thu: reload giữ đúng liều/đơn vị/tần suất Vet nhập, đồng thời add/sign không mất thuốc, lịch sử thay ngày sau chốt truy được bản trước.

### VET-09 — Khu chuồng và hình học — P2

**Thiếu khu/hình học.** `horses/models.py:Stall` có ClubID/StallNumber/StallType/Status; StallAssignment có lịch sử; không Barn/Area/geometry. Không suy phân khu từ tiền tố StallNumber. FE dùng nhóm “Chưa phân khu”, lưới ô thật, nhóm ngựa chưa xếp, chú giải chữ/màu; không gọi là bản đồ thực địa.

Thêm StableArea thuộc CLB, Stall.AreaID nullable; geometry tùy chọn có version và đơn vị mét nếu được cung cấp. **Đề xuất** GET `/stable-areas` → `{ "count":1,"next":null,"previous":null,"results":[{"AreaID":2,"Name":"Khu A","ClubID":1}] }`; GET `/stalls?AreaID=2` bổ sung AreaID/AreaName, giữ CurrentHorse. Validation stall-area cùng CLB; quản lý cơ sở vật chất mới sửa, Vet chỉ đọc; transaction khi chuyển ô và unique occupied assignment. Audit chuyển ô/khu; không đổi Flow 1 cấp mã/xếp chuồng. Nghiệm thu: lọc khu chính xác, ô Available khác lỗi tải và Occupied chưa đối chiếu, ngựa chưa xếp không mất/trùng; không render geometry giả.

### VET-10 — Aggregate sức khỏe/điều kiện tập quy mô lớn — P2

**Thiếu aggregate riêng, chưa phải thiếu dữ liệu nguồn.** FE tải hết `/horses`, sau đó từng `/horses/{id}/medical-records` tối đa 4 luồng để tổng hợp kết luận. Điều này đúng completeness trong snapshot response nhưng tốn N request, không phải snapshot nhất quán khi đàn thay đổi đồng thời. Không dùng 0 khi lỗi. Sức khỏe và tập độc lập; số đếm theo bệnh án không đồng nghĩa số active lock.

**Đề xuất** GET `/vet/overview` → `{ "asOf":"2026-10-18T09:12:45+07:00","herdCount":40,"health":{"Healthy":30,"Monitor":4,"Injured":3,"Recovering":2,"Isolated":1},"training":{"Eligible":25,"Restricted":5,"Not Eligible":3,"Unknown":7},"activeLocks":{"Full":3,"Restricted":5},"urgentReports":2,"overdueSchedules":4 }`. Tái sử dụng Horse/record/lock/schedule/report, không tạo bảng đếm thủ công; read transaction snapshot theo CLB, định nghĩa “toàn đàn” là Approved. Filters trả list phân trang theo cùng tiêu chí/asOf. HORSE_VIEW/MEDICAL_MANAGE như contract thống nhất, audit truy cập aggregate nếu policy yêu cầu; không ảnh hưởng approval Flow 1. Nghiệm thu: hơn một trang vẫn đúng, lỗi là lỗi chứ không 0, không đưa ngựa CLB khác, thống kê và danh sách lọc khớp.

### VET-11 — Injury, marker 3D và diễn biến phục hồi — P2

**Thiếu BE và asset.** Chỉ có MedicalRecord.InjuryLocation text; không Injury/Marker/Assessment trong models hoặc SQL, không route persistence, không .glb/.gltf/.fbx, không thư viện 3D trong FE. Chưa có cơ/xương tương thích. FE không tạo 3D giả hoặc lưu localStorage rồi báo thành công.

Thêm Injury(horse,medicalRecord,anatomicalRegion,side,layer,modelVersion,point,description,severity,detectedAt,recoveryStatus), InjuryAssessment append-only và attachment theo quyền CLB. Enum side Left/Right/Midline, layer Surface/Muscle/Bone, severity và region cần chuyên môn xác nhận; point `{x,y,z}` number hữu hạn ở hệ tọa độ model cố định (đơn vị mét theo asset), modelVersion string bắt buộc, không tọa độ màn hình. **Đề xuất** POST `/horses/{horse}/injuries` `{ "MedicalRecordID":41,"Region":"vet-confirmed-region","Side":"Left","Layer":"Muscle","ModelVersion":"equine-v1","Point":{"x":0.1,"y":0.8,"z":0.2},"Description":"Do Vet nhập","Severity":"vet-confirmed-enum","DetectedAt":"2026-10-18T09:12:45+07:00","RecoveryStatus":"Active" }` → `{ "InjuryID":5,"revision":1 }`; POST `/injuries/{id}/assessments` `{ "Note":"…","RecoveryStatus":"Monitoring","AssessedAt":"2026-10-25T09:00:00+07:00","AttachmentIDs":[] }` → assessment ID/actor/time, giữ bản cũ. GET injuries/assessments phân trang theo quy ước chung. Validation horse-record-model cùng phiên bản và CLB, Vet ghi, bounded point/region theo asset manifest, idempotent create assessment, audit cả chỉnh marker. Không tự khóa/cách ly nếu thiếu kết luận hợp lệ. Nghiệm thu: xoay/zoom/reset/side/layer đúng asset, reload marker đúng tọa độ, ảnh/diễn biến không bị ghi đè, không truy cập CLB khác. Asset cần license, anatomical manifest, tọa độ, đơn vị và version trước khi chốt thư viện viewer.

## 5. Quyết định FE và phần chưa thể nghiệm thu

- Giữ giao diện xanh, layout rộng, loading/empty/error/retry; không thêm dependency, biểu đồ trang trí hoặc mock fallback. Không thay Manager tiếp nhận bằng thao tác Vet.
- Chỉ nháp chính chủ được tiếp tục; Signed mở kết quả/đính chính. Link kết quả đầu vào cho ngựa Approved dùng `?intake=1`, phân biệt với lập phiếu khám sau tiếp nhận. Link `?record=...` phải tìm được trong hồ sơ ngựa đã kiểm tra quyền; không tìm thấy thì dừng.
- Khóa tập mới không có ngày hết hạn từ FE; hiển thị lock thực tế riêng kết luận Signed. Chưa khẳng định toàn bộ race/expiry/partial restriction được BE xử lý đầy đủ (VET-03/04).
- Lịch list/nhóm theo ngày, tạo/hủy tiêm phòng/tẩy giun/móng/định kỳ đã nối. “Ghi nhận hoàn thành” vô hiệu hóa vì không thể lưu đủ dữ liệu thực hiện; chỉ định tái khám từ Signed record vẫn hiển thị riêng, không coi là lịch đã đặt/đã xử lý. Không tự tạo NextDueDate/chu kỳ.
- Chưa có viewer 3D, tạo marker, lịch sử phục hồi riêng, worker nhắc tự động; không đánh dấu hoàn tất các hạng mục này. Đã đối chiếu `Gop_y.docx` theo mục 1.1; ảnh giao diện riêng, asset 3D và kết luận cho các câu hỏi nghiệp vụ trong tài liệu vẫn chưa có.
- Chưa kiểm chứng schema/trigger/migration đã triển khai trên SQL Server người dùng. `managed=False` và script tạo bảng không chứng minh DB local/production đã cập nhật; không chạy lại `horse_v2.sql` (có DROP TABLE), migrate hoặc seed vào DB thật.

## 6. Chạy và kiểm chứng

Từ `frontend`: `npm.cmd run typecheck`, `npm.cmd run test:api`, `npm.cmd run lint`, `npm.cmd run build`.

Từ `backend`: `.\.venv\Scripts\python.exe manage.py test apps.medical.tests apps.training.tests apps.core.tests.test_medical_and_profile --settings=config.settings_test --noinput`. SQLite test không chạm SQL Server, không chứng minh trigger hoặc tính đúng của hai transaction đồng thời trên SQL Server.

Browser thật, database SQLite/media tạm riêng: backend `.\.venv\Scripts\python.exe -m apps.core.tests.browser_fixture`; frontend `$env:VITE_API_PROXY_TARGET='http://127.0.0.1:8001'; npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort`; terminal FE khác chạy `node tests/vet.browser.mjs`. Cần Chromium/Chrome/Edge hoặc `BROWSER_EXECUTABLE`. Không dùng fixture này cho triển khai thật. Fixture tạo tài khoản/mật khẩu chỉ cho kiểm thử, không đặt lại tài khoản thực tế.

Kiểm tra browser gồm Flow 1, xung đột nháp khi Vet khác lưu trước, quyền khác CLB, Signed bất biến, đính chính và reload; Flow 3 báo cáo → nhận → khám → thuốc → chốt → khóa Full, từ chối mở trước tái khám, kết luận Eligible không tự mở, mở sau tái khám, đóng báo cáo có kết luận, tạo và reload tiêm phòng; desktop/mobile/offline-retry. Đây là kiểm tra API thật qua Vite và Django, không mock HTTP. Cạnh tranh nhiều connection đồng thời/SQL trigger/asset 3D/worker vẫn chưa thể nghiệm thu.

## 7. Bàn giao thay đổi và kết quả

| File | Thay đổi |
|---|---|
| `frontend/src/App.jsx` | Routing phiếu khám sau tiếp nhận, theo record/report, giữ link kết quả đầu vào và báo lỗi dữ liệu hàng chờ vào overview |
| `frontend/src/api/horseApi.ts` | Payload loại khám, liên kết báo cáo/buổi tập; vẫn mặc định Initial Exam cho caller Flow 1 cũ |
| `frontend/src/api/vetApi.ts` | Đọc list đầy đủ và ghi POST/PATCH các resource y tế bằng API client chung |
| `frontend/src/pages/vet/VetOperations.jsx` | Báo cáo, khóa, thuốc, lịch y tế và tổng quan công việc từ API thật |
| `frontend/src/pages/vet/useVetResource.js` | Loading/error/retry, không để response resource cũ xuất hiện khi đổi ngựa |
| `frontend/src/pages/vet/VetWorkspace.jsx` | Gắn vận hành mới vào overview/herd/stalls/calendar/reports, nhãn khóa từ dữ liệu thật |
| `frontend/src/pages/vet/VetMedicalProfile.jsx` | Tích hợp các tab, khóa khẩn, mở phiếu khám mới/tiếp tục nháp |
| `frontend/src/pages/vet/VetExaminationForm.tsx` | Tái sử dụng form cho ExamType thật, yêu cầu Vet chọn loại khám, mở khóa khẩn độc lập nội dung phiếu |
| `frontend/src/pages/vet/vetDomain.js`, `VetWorkspace.css` | Chuẩn hóa lịch, enum hiển thị và layout thích ứng |
| `frontend/tests/api.test.mjs`, `frontend/tests/vet.browser.mjs` | Payload/link/type, lịch không sinh chu kỳ, browser thật từ report đến khóa/tái khám/mở và tạo/hủy lịch |
| `frontend/README.md`, tài liệu này | Hướng dẫn chạy, khả năng thực tế và gap cần bàn giao BE |

Kiểm chứng ngày 18/10/2026: **150/150 test BE**, **26/26 test API FE**, typecheck và production build qua. Lint không có lỗi, còn 8 cảnh báo `set-state-in-effect` ở code đã có của App/Manager. Build cảnh báo bundle JS hơn 500 kB (~554 kB), chưa tách bundle theo route. Browser Chrome thật desktop 1440px/mobile 390px đã qua chuỗi kiểm tra ở trên, gồm thêm tạo Restricted → nâng Full bằng UI, reload khóa, tạo/hủy lịch Farrier, và chặn thao tác hoàn thành thiếu dữ liệu.

Không đổi requirements.txt hoặc package-lock, không thêm dependency, không ghi database SQL Server. File `backend/package-lock.json` đã untracked trước khi bắt đầu và được giữ nguyên. Các backend gap là yêu cầu bàn giao, không phải các sửa đổi đã được triển khai.

Bổ sung sau khi nhận `Gop_y.docx`: cập nhật tài liệu đối chiếu, làm rõ HealthReport là cấu trúc thay thế CareIncidents hợp lệ và tách các câu hỏi nghiệp vụ chưa chốt. Phần bổ sung này chỉ sửa tài liệu; kết quả test ở trên thuộc lần triển khai FE trước đó, không được dùng làm bằng chứng rằng các đề xuất trong DOCX đã được triển khai hoặc đã được duyệt.
