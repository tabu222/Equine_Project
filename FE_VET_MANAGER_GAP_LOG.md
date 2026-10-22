# Bàn giao frontend Bác sĩ thú y và Quản lý câu lạc bộ

> Phần Veterinarian đã có lượt hoàn thiện mới: [bàn giao source/UI/kiểm thử 22/10/2026](backend/docs/VET_WORKSPACE_20261022.md). Báo cáo bên dưới giữ làm lịch sử tích hợp; nội dung lịch chỉ xác nhận trạng thái hoàn thành không còn là hành vi UI hiện tại. Lượt mới không sửa các màn hình Quản lý hay đồng bộ GitHub.

Ngày đối chiếu: 22/10/2026. Backend làm căn cứ: `d4e69c4` từ `origin/main`.

## Đồng bộ GitHub và phạm vi thay đổi

- Đã fetch origin và fast-forward nhánh hiện tại từ `67b4559` tới `d4e69c4`, gồm 7 commit mới trên main. Nhánh `fix/vet-health-workspace` hiện chứa main mới; không đổi nhánh, không tự commit/push/deploy.
- Đã khôi phục 3 tệp staged của người dùng: App.jsx, LandingPage.jsx và LandingPage.css. Giữ stash `codex-preserve-user-edits-before-main-pull` làm bản dự phòng. Chỉnh sửa bổ sung trong lần này để unstaged.
- Bản main mới gỡ import/route VetWorkspace, VetMedicalProfile và xử lý tham số record/report. Đã khôi phục riêng luồng thú y từ phiên bản trước cập nhật, giữ những thay đổi huấn luyện mới của main và menu/landing của người dùng.
- Chỉ sửa mã frontend và tài liệu/kiểm thử frontend. Thay đổi backend/SQL trong Git là nội dung pull từ GitHub. Không chạy migration, seed hoặc thao tác dữ liệu trên SQL Server của dự án.

## Frontend đã hoàn thành và rà soát

### Bác sĩ thú y

- Khôi phục đủ route tổng quan, sức khỏe toàn đàn, kết quả đầu vào, chuồng, báo cáo sức khỏe, lịch và hồ sơ y tế; truyền currentUser vào hàng chờ để kiểm tra chủ sở hữu phiếu nháp.
- Giữ tìm kiếm, lọc sức khỏe/điều kiện tập, 6 trạng thái sức khỏe, chú giải, ô trống/bảo trì và ngựa chưa có chuồng. Dùng lưới chuồng từ dữ liệu thật, không dựng phân khu hoặc tọa độ.
- Đổi nhãn Healthy thành “Khỏe mạnh”, tách rõ sức khỏe, điều kiện tập theo bệnh án và khóa hiện hành. Không hiển thị dữ liệu chưa tải thành số 0.
- Xem/tạo/sửa nháp, chốt và thêm đính chính; mở đúng phiếu bằng record hoặc báo cáo bằng report. Phiếu đã chốt không được sửa trực tiếp; nháp của bác sĩ khác chỉ đọc.
- Đơn thuốc: thêm vào nháp của người dùng; sửa đầy đủ thuốc trên nháp của người lập; phiếu đã chốt chỉ gửi EndDate/WithdrawalUntil. Không gửi MedicineName/Dose/Route/StartDate/Note khi sửa thuốc của phiếu đã chốt. Validation hiển thị ở trường tương ứng, giữ biểu mẫu khi thất bại. Tần suất vẫn ở Note.
- Khóa huấn luyện: tạo Full/Restricted, điều chỉnh, mở khóa theo phản hồi backend; hiển thị người tạo/thời gian/giới hạn. Thông báo số và ID buổi bị hủy chỉ khi response có CancelledSessionIDs. Sau thành công tải lại khóa và hồ sơ; lỗi không tự tải lại gây mất biểu mẫu.
- Lịch: tạo, sửa, hủy và xác nhận Completed; lọc hôm nay/sắp tới/quá hạn/hoàn thành. Biểu mẫu hoàn thành yêu cầu người dùng xác nhận công việc đã thực hiện. Tiêm phòng có VaccineName, VaccinationDate, NextDueDate, Note; lịch khác chỉ cập nhật ngày hẹn, loại, ghi chú và trạng thái. Không giả lập trường ngày thực hiện/kết quả hoặc tự tạo lịch tiếp theo.
- Thông báo có tải/lỗi/rỗng/làm mới, liên kết đúng phiếu/ngựa/báo cáo/lịch, lọc chưa đọc và đánh dấu đọc trên server. Polling 30 giây khi trang thông báo hiển thị, dùng chung request đang chạy và dọn timer khi rời trang. Không nhắc khi đóng ứng dụng.
- Chấn thương giữ vị trí bằng chữ và lịch sử phiếu; hiển thị “Chức năng đánh dấu 3D chưa khả dụng”.

### Quản lý câu lạc bộ

- Giữ các luồng ngựa hiện có; khôi phục nút đi tới form tạo ngựa theo quyền, chặn gửi lặp ở tạo hồ sơ/thao tác tiếp nhận; không hiển thị tổng ngựa chưa tải thành 0. Đổi “Xử lý Flow 1” thành “Xử lý hệ thống”.
- Nhân sự: danh sách, tìm kiếm, lọc vai trò, tách nhân sự/chủ ngựa; xem chi tiết, tạo nhân sự với vai trò từ GET roles; sửa hồ sơ, gán nhiều vai trò, khóa/mở và đặt lại mật khẩu. Chủ ngựa không được gộp với nhân sự, không tự bỏ vai trò quản lý hoặc tự khóa/đặt lại mật khẩu trong mục quản trị. Backend vẫn quyết định các quy tắc này.
- Mật khẩu tạm chỉ giữ trong state, hiện một lần sau response, có nút ẩn, mất khi rời trang. Không ghi log hoặc lưu localStorage.
- Phân quyền vai trò: đọc Roles/Permissions/LockedCells từ backend, tôn trọng ô/vai trò cố định, gửi PUT danh sách quyền và hỗ trợ khôi phục mặc định. Có thông tin rõ phạm vi dùng chung mọi CLB và xác nhận trước khi lưu/khôi phục. Tách khỏi gán vai trò tài khoản; làm mới quyền của người đăng nhập sau thay đổi.
- Kho: danh sách/tìm kiếm/lọc loại và trạng thái; thêm/sửa metadata, ngưng/sử dụng lại, điều chỉnh tồn bằng API stock; danh sách yêu cầu, duyệt số lượng/xuất kho và từ chối có lý do. Không thay đổi Quantity qua PATCH metadata.
- Báo cáo: dùng dashboard thật với tổng ngựa chưa lưu trữ, số chuồng/tài khoản; số buổi theo trạng thái hôm nay/tuần/30 ngày và điểm kết quả trung bình 30 ngày. Null hiển thị chưa có kết quả, không thành 0. Tài chính hiển thị chưa có dữ liệu.
- Nhật ký hệ thống: bộ lọc UserID/ActionType/EntityName/EntityID/From/To, phân trang 50 dòng theo Limit/Offset; chi tiết nằm trong response danh sách. Không dùng lịch sử trình duyệt.
- Menu và route quản trị kiểm tra quyền backend trả về. Các trang tự tải dữ liệu độc lập, lỗi danh sách tiếp nhận không chặn trang nhân sự/kho/nhật ký hoặc hồ sơ thú y.

### Thành phần dùng chung và ngôn ngữ

- Giữ React, API client/token/refresh hiện có, không thêm dependency.
- Bổ sung apiPut, hook tải resource và mutation, trạng thái tải/lỗi/rỗng, form field/feedback dùng chung. Có khóa gửi request lặp; không báo thành công khi chưa nhận response thành công.
- Việt hóa nhãn Bác sĩ thú y, Quản lý, Khóa toàn bộ/Giới hạn cường độ, Chăm sóc móng, Nhật ký hệ thống; sửa thông báo tiếp nhận đang lộ enum/field tiếng Anh, nhãn Healthy gây nhầm với điều kiện tập và lỗi kết nối tiếng Anh.
- Tên trường validation chung được trình bày bằng nhãn tiếng Việt; fieldErrors vẫn giữ nguyên tên wire để đánh dấu đúng input. Không đổi enum, role/permission code, route hoặc payload backend.
- Giữ giờ CLB Asia/Ho_Chi_Minh (UTC+07:00), ngày thuần YYYY-MM-DD không chuyển qua UTC midnight, datetime giữ giây.

## API thực tế đã nối

Đường dẫn dưới đây tính từ `/api`. Đối chiếu trực tiếp accounts/views.py, accounts/user_admin.py, accounts/serializers.py, core/notifications.py, core/dashboard.py, horses/views.py, medical/{views,serializers,services}.py và care/{views,serializers,services}.py. Mọi request dùng client xác thực chung.

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/auth/me` | Tài khoản và quyền đang đăng nhập; cập nhật sau sửa quyền |
| GET | `/horses`, `/horses/{id}`, `/stalls` | Đàn ngựa, hồ sơ, ô chuồng trong phạm vi backend |
| GET | `/vet/pending-initial-exams`, `/horses/{id}/registration-requests`, `/horses/{id}/documents` | Hàng chờ, lần đăng ký và tài liệu |
| GET/POST | `/horses/{id}/medical-records` | Lịch sử/tạo phiếu khám |
| PATCH | `/medical-records/{id}` | Sửa nháp của người lập |
| POST | `/medical-records/{id}/sign` | Chốt phiếu |
| GET/POST | `/medical-records/{id}/amendments` | Xem/thêm đính chính Reason, AmendedContent |
| GET | `/horses/{id}/treatments` | Thuốc của ngựa |
| POST | `/medical-records/{id}/treatments` | Thêm thuốc nháp |
| PATCH | `/treatments/{id}` | Sửa nháp hoặc chỉ EndDate/WithdrawalUntil trên phiếu Signed |
| GET | `/training-locks?HorseID=&LockStatus=` | Khóa hiện hành/lịch sử |
| POST | `/horses/{id}/training-locks` | Tạo khóa Reason, LockLevel, MaxIntensity, Details |
| PATCH | `/training-locks/{id}` | Điều chỉnh khóa |
| POST | `/training-locks/{id}/release` | Mở khóa với Note, backend kiểm tra phiếu khám |
| GET | `/health-reports` | Báo cáo sức khỏe |
| POST | `/health-reports/{id}/take`, `/notes`, `/resolve` | Nhận ca, ghi Content, kết thúc bằng VetNote |
| GET | `/vaccinations`, `/horses/{id}/vaccinations` | Lịch tiêm phòng |
| POST | `/horses/{id}/vaccinations` | Tạo lịch tiêm |
| PATCH | `/vaccinations/{id}` | Sửa, Cancelled hoặc Completed, NextDueDate theo chỉ định |
| GET | `/medical-schedules`, `/horses/{id}/medical-schedules` | Tẩy giun/chăm sóc móng/khám định kỳ |
| POST | `/horses/{id}/medical-schedules` | Tạo lịch |
| PATCH | `/medical-schedules/{id}` | Sửa ngày hẹn/loại/ghi chú/trạng thái |
| GET | `/notifications` | Thông báo có Key và IsRead |
| POST | `/notifications/read` | `{Keys:[...]}` hoặc `{All:true}` lưu trạng thái đọc trên server |
| GET/POST | `/users` | Danh sách/tạo tài khoản FullName, Email, Phone, Address, RoleCode |
| GET/PATCH | `/users/{id}` | Chi tiết/sửa FullName, Phone, Address |
| PUT | `/users/{id}/roles` | `{RoleCodes:[...]}` gán vai trò tài khoản |
| POST | `/users/{id}/lock`, `/unlock`, `/reset-password` | Khóa với Reason, mở, mật khẩu tạm |
| GET | `/roles` | Vai trò/quyền và ô cố định |
| PUT | `/roles/{RoleCode}/permissions` | `{PermissionCodes:[...]}` quyền dùng chung các CLB |
| POST | `/roles/reset-defaults` | Khôi phục mặc định |
| GET | `/dashboard` | Tổng hợp thật cho quyền CLUB_MANAGE, bao gồm Training |
| GET | `/audit-logs` | Các bộ lọc, Limit/Offset, response Total/Items |
| GET/POST | `/inventory-items` | Danh sách/tạo ItemName, ItemType, Unit, Quantity, MinimumQuantity |
| PATCH | `/inventory-items/{id}` | Sửa metadata, Status Inactive hoặc Reactivate true |
| POST | `/inventory-items/{id}/stock` | Điều chỉnh `{Change,Note}` |
| GET | `/inventory-requests?Status=` | Yêu cầu và chi tiết Items |
| POST | `/inventory-requests/{id}/approve` | `{Items:[{InventoryItemID,ApprovedQuantity}]}` duyệt và xuất kho |
| POST | `/inventory-requests/{id}/reject` | `{Note}` từ chối |

Các API ngựa đã có tiếp tục được giữ: POST `/horses`, PATCH `/horses/{id}`, POST `/horses/{id}/submit`, `/verify`, `/reject`, `/approve`, `/archive`; GET `/profile-change-requests`; POST `/profile-change-requests/{id}/approve`, `/reject`. Không xây lại các luồng này.

## API mới chỉ đáp ứng một phần

| Nội dung | Giới hạn được xác nhận từ source | Cách FE xử lý |
|---|---|---|
| Hoàn thành lịch ngoài tiêm phòng | MedicalSchedule có ScheduledDate/Status/Note; không có PerformedDate, kết quả có cấu trúc hay lịch kế tiếp | Chỉ xác nhận Completed, giữ ngày hẹn; ghi rõ phạm vi trên biểu mẫu, không dựng các trường chưa lưu được |
| Tiêm phòng | Có VaccinationDate/NextDueDate/Status/Note; không có hai mốc ngày hẹn/ngày thực hiện riêng | Khi hoàn thành, nhãn cho biết cập nhật ngày tiêm đang lưu; ngày nhắc do bác sĩ nhập, không tự tạo event hoặc chu kỳ |
| Khóa huấn luyện | Có CancelledSessionIDs trên tạo/sửa; release tìm phiếu Signed sau khóa theo luật hiện tại; Active có LockEndDate vẫn chịu cách tính covers của backend | Không tuyên bố đã dừng buổi đang diễn ra, không tự mở khóa hoặc thay luật tái khám; hiển thị thời gian backend trả |
| Thông báo | Danh sách tính từ trạng thái hiện tại; có persistence trạng thái đọc trong NotificationRead, không có dịch vụ push/background reminder | Polling chỉ trên trang hiển thị, không hứa nhắc khi đóng ứng dụng |
| Báo cáo | Dashboard có tổng hợp và điểm 30 ngày, không có dữ liệu tài chính hoặc chuỗi xu hướng dài hạn | Hiển thị đúng kỳ và định nghĩa; null không thành số 0, không vẽ xu hướng từ buổi gần nhất |
| Phân quyền | RolePermission dùng chung mọi CLB, không có ClubID riêng | Thông báo phạm vi áp dụng và yêu cầu xác nhận tại thao tác giao diện; backend vẫn là nguồn kiểm tra quyền |

## Chưa có API/tài nguyên và đề xuất bổ sung

Đây là backlog đề xuất, không phải API đang tồn tại. Không tự sửa backend hoặc database trong lần này.

1. **Lịch y tế đầy đủ:** thêm ngày hẹn và thời điểm thực hiện riêng, người thực hiện, kết quả, quy tắc chuyển trạng thái và chỉ định lịch tiếp theo. Cần chốt các dữ liệu nghiệp vụ bắt buộc trước khi mở form ghi kết quả đầy đủ. Không suy chu kỳ từ frontend.
2. **Chấn thương 3D:** source hiện không có thư viện 3D, asset mô hình ngựa/anatomy hoặc API marker. Cần mô hình đã xác minh, version và quy ước vùng/bên cơ thể/tọa độ; endpoint marker có phân quyền, liên kết phiếu khám và lịch sử thay đổi. FE hiện giữ InjuryLocation bằng chữ.
3. **Báo cáo tài chính:** chưa có endpoint chi phí/doanh thu giải đấu, định nghĩa ghi nhận và dữ liệu thu/chi. Cần báo cáo tổng hợp theo kỳ và CLB, không suy doanh thu từ thành tích.
4. **Nhắc tự động:** cần tác vụ server và kênh gửi thực, chính sách chống trùng, giờ CLB và cơ chế theo dõi gửi. Polling hiện tại không thay dịch vụ này.
5. **Hiệu lực và đồng thời y tế:** tiếp tục các vấn đề đã đối chiếu trong `backend/docs/VET_BACKEND_REQUIREMENTS.md`: nhận ca/chốt đồng thời, quan hệ tái khám với khóa và hiệu lực LockEndDate. Không đổi luật ở FE để che gap này.
6. **RBAC theo CLB nếu có nhu cầu:** schema hiện dùng chung vai trò/quyền. Muốn phạm vi từng CLB cần backend/schema và quyết định nghiệp vụ riêng, không chỉ đổi nhãn trên FE.

Nhân sự, RBAC, kho và đọc Audit Log **đã có API sau pull**; không còn được đánh dấu “chưa có API”. Lỗi mạng/403/404/500 luôn hiển thị lỗi, không chuyển sang dữ liệu giả.

## Kiểm tra đã chạy và giới hạn

- `npm.cmd run typecheck`: đạt.
- `npm.cmd run test:api`: 26/26 đạt (adapter thực với HTTP kiểm soát; không phải E2E).
- `npm.cmd run lint`: exit 0, không có lỗi; còn 26 cảnh báo đã có ở App, các trang danh sách và module huấn luyện (effects, Fast Refresh, unused/exhaustive-deps/unsafe-finally). Không phát sinh cảnh báo ở component quản trị mới.
- `npm.cmd run build`: đạt; còn cảnh báo bundle JS lớn hơn 500 kB. Chưa tối ưu chia bundle ngoài phạm vi tính năng này.
- `python manage.py check --settings=config.settings_test`: đạt.
- `python manage.py test apps.core.tests.test_admin_rbac apps.medical.tests apps.care.tests --settings=config.settings_test --noinput`: 39/39 đạt, SQLite tạm.
- `node tests/vet.browser.mjs`: đạt trên Chromium thật + Vite + Django + SQLite tạm. Bao gồm nháp/reload/ngày giờ, sai chủ phiếu và sai CLB, cạnh tranh nhận nháp, chốt/đính chính, thuốc tạo/sửa/validation giữ form, sửa thuốc Signed đúng giới hạn, báo cáo và khóa/tái khám/mở khóa, tạo lịch và xác nhận Completed, offline/retry, màn hình 390px.
- `node tests/manager.browser.mjs`: đạt sau bộ Vet trên cùng fixture. Bao gồm tạo nhân sự/validation giữ form/mật khẩu không lưu localStorage, sửa hồ sơ/gán role/khóa/mở, lưu quyền vai trò, tạo kho/điều chỉnh/duyệt yêu cầu và trừ tồn, dashboard, audit lọc/chi tiết, thông báo đã đọc qua server và reload, chặn route/API sai vai trò, 390px.
- Screenshot được chụp ở desktop 1440px và mobile 390px trong thư mục temp của từng browser run; đã xem lại ảnh giao diện.
- `git diff --check`: đạt, chỉ có thông tin chuẩn hóa CRLF/LF của Git.

Kiểm thử trình duyệt là tích hợp thật trên **database SQLite thử nghiệm** của fixture. Chưa kiểm thử SQL Server thật, các trigger/filtered indexes, email thực, Google login, lỗi 500 do SQL Server hoặc tác vụ nền. Không tuyên bố E2E với database đang dùng của người dùng. Các nút đặt lại mật khẩu/khôi phục RBAC, sửa tiêm phòng và một số thao tác kho được nối theo source và có test backend liên quan, chưa đi qua tất cả nhánh bằng trình duyệt trong lượt kiểm tra này.

Chạy lại bằng terminal riêng:

```powershell
# Terminal 1, backend: tạo database SQLite mới trong temp mỗi lần chạy
Set-Location C:\Equine_Project\backend
.\.venv\Scripts\python.exe -m apps.core.tests.browser_fixture

# Terminal 2, frontend
Set-Location C:\Equine_Project\frontend
$env:VITE_API_PROXY_TARGET='http://127.0.0.1:8001'
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort

# Terminal 3, frontend: chạy tuần tự trên cùng fixture mới
Set-Location C:\Equine_Project\frontend
node tests/vet.browser.mjs
node tests/manager.browser.mjs
```

Không chạy bộ browser lại trên cùng fixture đã có dữ liệu kiểm thử: dừng và chạy lại fixture để tạo database temp mới. Các bài test có dữ liệu tổng hợp dành riêng cho kiểm thử, không có mock trong luồng ứng dụng.
