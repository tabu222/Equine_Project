# Bàn giao không gian thú y — 22/10/2026

Đối chiếu trực tiếp source hiện tại; tài liệu cũ không được dùng để kết luận API còn thiếu. Lần thay đổi này chỉ sửa frontend, kiểm thử frontend và tài liệu. Không sửa Python backend, SQL, phân quyền, tài khoản, `.env` hoặc database nghiệp vụ; không commit/push.

## 1. Màn hình và quy trình đã triển khai

- Khôi phục router/sidebar cho `/vet/overview`, `/vet/herd`, `/vet/stalls`, `/vet/reports`, `/vet/calendar`, `/vet/intake-results`, `/vet/notifications`. Trước sửa, các component đã tồn tại nhưng nhiều route không được đăng ký trong `App.jsx`.
- Tổng quan có công việc cần xử lý theo ngựa, lý do, mức độ, thời điểm và hành động; số liệu có liên kết đến danh sách lọc. Tách trạng thái sức khỏe, kết luận điều kiện tập và lệnh khóa. Số liệu toàn đàn chỉ tính sau khi tải đủ danh sách; lỗi không biến thành 0. Chỉ tính đàn đã Approved; hồ sơ đầu vào được theo dõi riêng.
- Hàng chờ gồm khám đầu vào, nháp khám sau tiếp nhận và báo cáo chưa có bệnh án. Khám đầu vào liên kết đúng RegistrationRequest; phân biệt nháp chính chủ/bác sĩ khác. Có tìm tên/mã/microchip, tiến độ đầu vào và sắp xếp. RequestDate/WaitingHours được ghi rõ là thời gian từ lúc gửi hồ sơ, không gọi là thời gian từ lúc chuyển sang chờ khám. Mở form chưa được coi là nhận ca; tạo nháp thành công mới ghi nhận bác sĩ.
- Màn hình khám rộng, chia thành thông tin lần khám, kiểm tra, chẩn đoán, điều trị, kết luận; có mục lục, tóm tắt ngựa bên phải và bố cục dọc trên điện thoại. Chỉ dùng các trường serializer nhận. Không bắt kết luận/chẩn đoán khi lưu nháp; khi chốt yêu cầu sức khỏe, điều kiện tập và hạn chế cụ thể nếu Restricted, đúng quy tắc backend hiện tại.
- Kê/sửa thuốc ngay trong lần khám, gắn chính xác MedicalRecordID. Lưu bệnh án và lưu thuốc là hai thao tác độc lập: lỗi thuốc không tạo lại bệnh án. Liều kèm đơn vị vào Dose; tần suất/hướng dẫn vào Note; giữ nguyên Route và các trường ngày. Không tự điền thuốc/liều/ngày ngưng thuốc. Không có nút xóa riêng thuốc vì chưa có endpoint.
- Bước kiểm tra trước chốt hiển thị nội dung và thuốc đã lưu; ngăn chốt khi thuốc còn nội dung chưa lưu. Giải thích đúng ảnh hưởng của Not Eligible, Restricted và Eligible. Sau chốt hiển thị bệnh án theo các mục đọc, không phải input bị disable.
- Cảnh báo điều hướng/tải lại khi còn nội dung chưa lưu, một router blocker chung cho các phần y tế. Dữ liệu khám không được ghi vào localStorage. Chặn gửi lặp bằng ref đồng bộ và trạng thái nút. Validation giữ nội dung và đưa focus đến mục sai.
- Khi mất phản hồi tạo nháp/chốt/thuốc/đính chính: giữ nội dung, khóa gửi lại và cho kiểm tra dữ liệu đã lưu. Chỉ tự xác nhận khi tìm được đúng một kết quả phù hợp. Không có kết quả chắc chắn thì giữ trạng thái chưa xác nhận, không tự lặp POST. Nếu xung đột nháp/chốt, tải lại trạng thái và tôn trọng người lập phiếu.
- Hồ sơ có bệnh án theo ID trong URL, tìm triệu chứng/chẩn đoán/bác sĩ, lọc loại khám/trạng thái/khoảng ngày. Đính chính cần lý do/nội dung, hiện người tạo và thời gian, giữ nguyên MedicalRecord đã chốt. Thuốc trên bệnh án hiển thị thông tin điều trị hiện tại; backend vẫn cho cập nhật EndDate/WithdrawalUntil sau chốt, không coi đây là bản chụp đơn thuốc bất biến.
- Chấn thương có vị trí bằng chữ và diễn biến từ từng bệnh án: chẩn đoán, hướng điều trị, sức khỏe, điều kiện tập, ngày tái khám và liên kết đúng phiếu. Không tạo marker hoặc ảnh xoay giả.
- Khóa khẩn độc lập form khám; tạo Full/Restricted, sửa mức/tải tối đa và mở khóa qua backend. Hiển thị người tạo, lý do, thời điểm, giới hạn, lịch sử mở và các mã buổi tập bị hủy trong response. Không tự mở theo ngày. Không quy đổi TrainingLoad/MaxIntensity sang km, phút hay nhịp tim. Khi sửa khóa không đưa Reason/Details vào form vì service hiện bỏ qua các trường này (mục 3).
- Báo cáo có ưu tiên khẩn, tìm kiếm/lọc, người báo, thời điểm, triệu chứng, liên kết ảnh và buổi tập, bác sĩ phụ trách, diễn biến; nhận xử lý/tạo hoặc mở đúng bệnh án/khóa khẩn/kết thúc bằng thao tác riêng. Xem báo cáo không tự kết thúc.
- Lịch có danh sách/nhóm ngày, bộ lọc loại/ngựa/khoảng ngày/trạng thái/thời hạn; tạo/sửa/hủy theo endpoint thật. Một lần tạo tiêm phòng chỉ POST vào vaccinations, không đồng thời tạo medical-schedules. Không tự sinh chu kỳ. Chỉ định FollowUpDate từ bệnh án nằm riêng với lịch đã đặt. Không cung cấp nút hoàn thành vì contract chưa lưu đủ thông tin thực hiện (mục 3).
- Sơ đồ chuồng dùng Stall/CurrentHorse thật, chú giải chữ/màu và nhãn khóa; tách Available/Maintenance/Occupied chưa đối chiếu/ngựa chưa xếp chuồng/lỗi tải. Không tự đặt phân khu hoặc tọa độ thực địa.
- UI giữ hệ màu Equi, nền trung tính, bỏ banner ảnh ngựa khỏi vùng làm việc thú y, tăng cỡ chữ form/bảng, có skeleton/empty/error/retry, không thêm biểu đồ trang trí hoặc dependency.

## 2. Contract đã nối và mức xác minh

Tất cả đường dẫn có prefix `/api`. Dùng lại `apiClient.ts`, JWT/refresh hiện tại và permission từ tài khoản; không có API client, token hoặc RBAC riêng cho Vet. Dịch enum ở tầng hiển thị.

| Chức năng | Endpoint hiện tại | Kết luận từ source và kiểm tra |
|---|---|---|
| Đàn ngựa/chuồng/ảnh/hồ sơ tiếp nhận | GET `/horses`, `/stalls`, `/horses/{id}`, `/horses/{id}/documents`, `/horse-documents/{id}/file`, `/horses/{id}/registration-requests` | Có API; scope từ `get_visible_horse` và quyền tài liệu. Ảnh qua endpoint xác thực và blob URL của HorseAvatar, không ghép đường dẫn disk. |
| Hàng chờ đầu vào | GET `/vet/pending-initial-exams` | Có API, trả RegistrationRequestID/DraftMedicalRecordID/DraftVetID; chưa có endpoint nhận riêng. |
| Bệnh án | GET/POST `/horses/{id}/medical-records`, GET/PATCH `/medical-records/{id}`, POST `.../sign` | Có API và quy tắc nháp chính chủ. Initial Exam chỉ PendingExam; các loại khám khác chỉ Approved. PATCH không đổi ExamType. |
| Đính chính | GET/POST `/medical-records/{id}/amendments` | Có API, Signed mới được thêm; lưu người/thời điểm và không sửa nội dung gốc. |
| Thuốc | GET `/horses/{id}/treatments`, GET/POST `/medical-records/{id}/treatments`, PATCH `/treatments/{id}` | Có API thêm/sửa; một phần về xóa, cấu trúc liều và lịch sử sửa sau chốt. |
| Khóa tập | GET `/training-locks`, POST `/horses/{id}/training-locks`, GET/PATCH `/training-locks/{id}`, POST `.../release` | Có API; một phần về sửa lý do, hiệu lực thời gian và đảm bảo đồng thời. |
| Báo cáo | GET `/health-reports`, GET `/health-reports/{id}`, POST `.../take`, `.../notes`, `.../resolve` | Có API nhận, diễn biến, liên kết bệnh án và kết thúc. Quy tắc sở hữu/đồng thời còn một phần. |
| Tiêm phòng/lịch | GET `/vaccinations`, `/medical-schedules`, GET/POST `/horses/{id}/vaccinations`, `/horses/{id}/medical-schedules`, PATCH `/vaccinations/{id}`, `/medical-schedules/{id}` | Có API tạo/sửa/hủy và cập nhật Status; chỉ hỗ trợ một phần việc hoàn thành nghiệp vụ. Không có ScheduleType tái khám riêng. |
| Thông báo | GET `/notifications`, POST `/notifications/read` | Có API và trạng thái đã đọc trên server. Nhắc hạn tính khi lấy thông báo; không chứng minh có worker chạy nền. |

Nguồn chính: [routes](../apps/medical/urls.py), [models](../apps/medical/models.py), [serializer](../apps/medical/serializers.py), [services](../apps/medical/services.py), [views](../apps/medical/views.py), [permissions](../apps/core/permissions.py), [API](API.md). Các API bên trên không được báo là còn thiếu chỉ vì tài liệu cũ từng ghi thiếu.

Kiểm tra chỉ đọc trên SQL Server local ngày 22/10/2026: **16 request trả 200**, gồm auth/me; horses, stalls, pending-initial-exams, health-reports, training-locks, vaccinations, medical-schedules; sáu tài nguyên con của một ngựa Approved (bệnh án, thuốc, tiêm phòng, lịch, đăng ký, tài liệu); thuốc và đính chính của một bệnh án. Dùng APIClient với JWT cấp tạm trong tiến trình kiểm tra từ tài khoản Vet có sẵn và quyền thật; không đổi mật khẩu, không đổi role, không tạo token lưu trong DB, không ghi dữ liệu nghiệp vụ. Đây là xác minh đọc qua Django/SQL Server, **không phải kiểm thử trình duyệt đăng nhập SQL Server bằng mật khẩu** và không xác minh các thao tác ghi/trigger/đồng thời của SQL Server.

## 3. Phần cần backend/asset bổ sung

### A. Hoàn thành lịch y tế — có API nhưng thiếu dữ liệu nghiệp vụ

Bằng chứng: `models.py:Vaccination`, `MedicalSchedule`; các serializer cùng tên và `views.py:VaccinationDetailView`, `MedicalScheduleDetailView`. Status Completed đã có, VaccinationDate và VetID cũng đã có; không được báo thiếu các trường này. Chưa có ngày thực hiện độc lập với lịch hẹn, kết quả thực hiện và người thực hiện tách khỏi bác sĩ lịch hẹn. PATCH hiện bảo toàn bác sĩ cũ khi không gửi ExternalVet. Note tự do không thay một hợp đồng hoàn thành đủ dữ liệu.

Đề xuất thêm PerformedAt/PerformedBy/Result/CompletionNote và reference thủ thuật/bệnh án khi phù hợp; POST `/{vaccinations|medical-schedules}/{id}/complete` với các trường này và idempotency key, giữ nguyên ngày hẹn. Actor xác định từ session; bác sĩ ngoài phải có cơ chế ghi nhận riêng. Kiểm tra scope CLB, quyền, trạng thái đang hẹn/quá hạn, thời điểm hợp lệ, kết quả không rỗng, kết thúc/hủy đồng thời; trả lại bản hoàn thành và audit. Nghiệm thu: reload giữ lịch hẹn, ngày/kết quả/người thực hiện đúng, retry không tạo hai lần thực hiện, không hoàn thành lịch đã hủy. FE hiện chỉ tạo/sửa/hủy và xem trạng thái được lưu.

### B. Tái khám thành lịch có liên kết — có chỉ định, chưa có loại lịch riêng

Bằng chứng: MedicalRecord.FollowUpDate đã tồn tại; MedicalSchedule.ScheduleType chỉ Vaccination/Deworming/Farrier/Routine Examination, không có Follow-up hoặc liên kết lịch với bệnh án. Không gọi ngày chỉ định là lịch đã đặt hoặc là đã quá hạn xử lý thực tế.

Đề xuất thêm ScheduleType Follow-up và SourceMedicalRecordID; POST `/horses/{id}/medical-schedules` nhận hai trường này. Kiểm tra cùng ngựa/CLB, bệnh án nguồn đã chốt, ngày hẹn theo chỉ định hoặc lý do thay đổi, uniqueness lịch đang hẹn của cùng lần chỉ định. Nghiệm thu: tạo lại không nhân đôi, có thể mở đúng bệnh án nguồn và phiếu tái khám kết quả, hoàn thành được xác minh bằng hợp đồng mục A.

### C. Xóa thuốc và lưu hướng dẫn có cấu trúc — API hỗ trợ một phần

Bằng chứng: `urls.py` chỉ GET/POST treatments theo record và PATCH treatment; `TreatmentDetailView` không DELETE. Dose/Note đã có dạng chữ; Route/StartDate/EndDate/WithdrawalUntil/WithdrawalActive đã có. Không tự đặt Frequency/DoseUnit trong payload hiện tại.

Đề xuất DELETE `/treatments/{id}` cho Draft chính chủ, cùng transaction kiểm tra trạng thái với chốt phiếu, có audit; Signed dùng sự kiện ngừng/đính chính, không xóa. Nếu cần lọc/liều có cấu trúc: bổ sung DoseValue/DoseUnit/Frequency cùng DoseText kế thừa dữ liệu cũ; thống nhất danh mục đơn vị với nghiệp vụ trước khi bắt buộc. Nghiệm thu: draft xóa/reload không còn thuốc, Vet khác/Signed bị chặn, xóa và chốt đồng thời không làm mất đơn đã chốt; không làm mất chuỗi liều cũ.

### D. Đơn thuốc sau chốt — có cập nhật ngày, thiếu bản gốc và lịch sử revision

Bằng chứng: `services.py:update_treatment`, `SIGNED_TREATMENT_FIELDS` cho mọi Vet có quyền đổi EndDate/WithdrawalUntil trên phiếu Signed. Audit hiện ghi TreatmentID, chưa có snapshot thuốc cũ/mới. Vì vậy không khẳng định đơn thuốc sau chốt bất biến. FE vẫn nối cập nhật ngày theo đúng API và giữ tên/liều/đường dùng không sửa trên Signed.

Đề xuất POST `/treatments/{id}/amendments` nhận Reason/EndDate/WithdrawalUntil/ExpectedRevision; lưu giá trị trước/sau, người/thời gian, giữ bản thuốc tại thời điểm chốt. Kiểm tra scope, quyền, ngày kết thúc/ngưng không trước StartDate và revision xung đột. Nghiệm thu: xem được bản gốc khi chốt và mọi lần đổi ngày sau reload, retry không tạo hai amendment, revision cũ bị từ chối.

### E. Sửa lý do/ghi chú khóa — có PATCH nhưng service bỏ qua một phần

Bằng chứng: TrainingLockWriteSerializer nhận Reason/Details, nhưng `services.py:update_lock` chỉ tạo merged từ lock_level/max_intensity/lock_start_date/lock_end_date rồi ghi merged; Reason/Details trong values không được áp dụng. FE chỉ cho sửa mức khóa/tải tối đa; lý do/ghi chú vẫn được lưu đúng khi tạo mới.

Đề xuất sửa chính PATCH `/training-locks/{id}` để áp dụng các trường đã có, kèm ExpectedRevision và audit trước/sau. Kiểm tra Reason không rỗng/tối đa 100 ký tự, Details tối đa 2000, Restricted có MaxIntensity không âm, phạm vi thời gian hợp lệ. Nghiệm thu: PATCH rồi GET giữ đúng lý do/ghi chú, không mất metadata người tạo và không ghi đè thay đổi đồng thời.

### F. Hiệu lực khóa, hạn chế và đồng thời — có API/quy tắc, chưa xác minh đầy đủ

Bằng chứng: `services.py:active_lock` chọn LockStatus Active mà không xét thời gian; `_cancel_sessions_for_lock` có xét khoảng ngày và tải; `release_lock` yêu cầu bệnh án Signed sau thời điểm khóa, kết luận khác Not Eligible, nhưng không bắt ExamType phải Follow-up và có thể chấp nhận Restricted. Các service tạo/sửa/chốt/nhận báo cáo không dùng row-version/idempotency key; ATOMIC_REQUESTS không tự chứng minh thao tác đồng thời đã an toàn. SQL có trigger/index cần kiểm chứng riêng trên DB thực.

Đề xuất thống nhất định nghĩa effective lock theo thời gian/tải cho mọi tạo/sửa/start session; trả IsEffective/EffectiveReason/Revision trong read API; dùng transaction/row lock hoặc revision nhất quán giữa chốt bệnh án/nhận ca/thêm thuốc/tạo khóa/xếp và bắt đầu buổi tập. Mở khóa khi kết luận Restricted cần quy tắc rõ: giữ/chuyển Restricted tương ứng, không âm thầm bỏ giới hạn. Nghiệm thu bắt buộc trên SQL Server bằng hai connection: không nhận trùng ca, không mất thuốc/chốt hai lần, Full/Restricted được áp dụng khi xếp/sửa/start, ngày dự kiến không tự mở sai, buổi đang chạy và tải null có quy tắc xác định. FE không tuyên bố đã chặn mọi tình huống này.

### G. Sở hữu báo cáo và liên kết bệnh án — API đã có, quy tắc còn một phần

Bằng chứng: `services.py:take_report` kiểm tra trạng thái; `check_report_for_record` kiểm tra ngựa/trạng thái/đã liên kết nhưng không kiểm tra bác sĩ đã nhận; `link_report_to_record` giữ Vet cũ nếu đã có. `resolve_report` cũng không bắt người kết thúc là bác sĩ nhận. FE chỉ mở tạo phiếu cho báo cáo phù hợp ngựa/chủ xử lý và dùng lại MedicalRecordID đã có, nhưng đây không thay thế kiểm tra server.

Đề xuất bổ sung kiểm tra bác sĩ phụ trách ở chính create-record/resolve; nếu cần chuyển ca thì có POST `/health-reports/{id}/reassign` với lý do và người nhận cùng CLB. Nhận ca/liên kết sử dụng transaction có khóa hoặc ExpectedRevision; lỗi trả 409 và resource ID mới nhất. Nghiệm thu: hai Vet nhận đồng thời chỉ một thành công, không tạo hai phiếu cho cùng báo cáo, Vet khác không vượt chủ nhận qua gọi API trực tiếp, lỗi scope luôn bị chặn.

### H. Idempotency và tổng hợp — thiếu hợp đồng riêng, không thiếu dữ liệu nguồn

Nguồn: create_record/add_treatment/add_amendment và các endpoint list hiện tại. FE đọc đủ trang và tải bệnh án từng ngựa với concurrency tối đa 4. Đây không phải snapshot nhất quán toàn đàn khi dữ liệu thay đổi đồng thời. Đối chiếu mất phản hồi của FE dựa ID/những giá trị đã gửi; nếu chưa chắc chắn, FE không gửi lại tự động.

Đề xuất Idempotency-Key và GET trạng thái thao tác cho các POST y tế; uniqueness key theo CLB/người dùng/phạm vi, lưu kết quả cùng transaction, cùng key khác payload trả 409. Đề xuất GET `/vet/overview` trả asOf/herdCount/counts theo sức khỏe, điều kiện tập, khóa có hiệu lực, báo cáo và lịch; danh sách lọc cùng định nghĩa và scope. Nghiệm thu: timeout sau commit trả cùng resource khi retry; thống kê vượt một trang vẫn đúng, lỗi không thành 0, không rò ngựa CLB khác, revision/snapshot được mô tả rõ.

### I. 3D, phân khu và nhắc nền — chưa có API/asset đủ điều kiện

Bằng chứng: source chỉ có MedicalRecord.InjuryLocation, không Injury/Marker/Assessment; không `.glb/.gltf/.fbx` và không dependency 3D. Stall có số/loại/trạng thái/CurrentHorse, không khu/geometry. `apps/core/notifications.py` tính nhắc khi GET, chưa có worker trong repository.

Đề xuất Injury/Assessment và GET/POST `/horses/{id}/injuries`, `/injuries/{id}/assessments` với vùng, bên, lớp cơ/xương, ModelVersion, tọa độ model, mô tả, trạng thái phục hồi, người/thời điểm; cần asset có license, anatomical manifest và hệ tọa độ/đơn vị cố định. Kiểm tra cùng ngựa/bệnh án/CLB, vùng/tọa độ thuộc model, assessment append-only; nghiệm thu reload marker đúng, lịch sử không mất, không ảnh xoay giả. Phân khu cần StableArea và Stall.AreaID nullable, GET `/stable-areas` và geometry version nếu có; nghiệm thu không suy khu từ số chuồng và không nhầm lỗi tải với ô trống. Nhắc nền cần job có dedupe theo lịch/người/mốc, múi giờ CLB và audit; nghiệm thu vẫn nhắc khi không mở FE, chạy lại không trùng. Đây là ba hạng mục bổ sung độc lập, không được coi là đã triển khai trong FE lần này.

## 4. Kiểm tra đã chạy

- `npm.cmd run typecheck`: qua.
- `npm.cmd run test:api`: **26/26** qua; gồm JWT refresh đồng thời, payload y tế, phân trang đầy đủ/an toàn, scope CLB, ngày giờ và đính chính.
- `npm.cmd run lint`: exit 0; **61 cảnh báo hiện hữu ngoài thư mục Vet**, không có cảnh báo trong `src/pages/vet`.
- `npm.cmd run build`: qua; còn cảnh báo bundle chính >500 kB do cấu trúc import chung toàn ứng dụng. Chưa thực hiện tách bundle cho các workspace khác.
- Backend: `manage.py test apps.medical.tests apps.training.tests apps.core.tests.test_medical_and_profile --settings=config.settings_test --noinput`: **67/67** qua, SQLite tạm.
- `node tests/vet.browser.mjs`: Chrome thật → Vite 5174 → Django fixture 8001, SQLite/media riêng. Qua hàng chờ/lưu nháp/reload/chốt, quyền nháp Vet khác và ngựa CLB khác, xung đột ca, Signed bị từ chối PATCH, đính chính/reload/giữ bản gốc; báo cáo → nhận → khám → kê/sửa thuốc → chốt → xem; khóa Full/Restricted, từ chối mở trước khám sau khóa, Eligible không tự mở, mở khóa sau kết luận hợp lệ; tạo/reload/sửa/hủy lịch và không có thao tác hoàn thành thiếu contract; offline/retry, giữ nội dung/focus validation, cảnh báo rời trang, chặn thuốc chưa lưu khi chốt. Kiểm thử mất response **sau commit** cho tạo nháp/chốt/thuốc và bấm gửi hai lần xác nhận chỉ có một bản ghi tương ứng. Desktop 1440, tablet 834 và mobile 390 không tràn ngang toàn trang; không có uncaught browser exception.
- SQL Server: chỉ đọc 16 API như mục 2. **Chưa kiểm chứng ghi/trigger/đồng thời SQL Server**, worker nhắc nền và asset 3D. Kết quả SQLite/browser fixture không được dùng để khẳng định các phần này.

Ảnh đã xem và rà soát: [tổng quan](../../frontend/artifacts/vet/vet-overview-desktop.png), [hàng chờ](../../frontend/artifacts/vet/vet-queue-desktop.png), [khám desktop](../../frontend/artifacts/vet/vet-examination-desktop.png), [khám mobile](../../frontend/artifacts/vet/vet-examination-mobile.png), [bệnh án và đính chính](../../frontend/artifacts/vet/vet-record-desktop.png), [lịch](../../frontend/artifacts/vet/vet-medical-calendar-desktop.png). Dữ liệu tên/nội dung trong ảnh là dữ liệu kiểm thử tách biệt.

Chạy lại browser phải dùng fixture mới cho mỗi lượt vì kịch bản tạo ngựa có microchip cố định. Cách khởi chạy fixture/Vite nằm trong [frontend README](../../frontend/README.md). Có thể đặt `BROWSER_ARTIFACT_DIR` để lưu ảnh trong workspace. Các dịch vụ kiểm thử không thay cấu hình backend thật cổng 8000 hoặc frontend thật cổng 5173.
