# Sơ đồ chấn thương ngựa 2D — 26/10/2026

## Tích hợp và phạm vi

Mở `/vet/horses/:id?tab=injuries`, trong hồ sơ y tế Veterinarian hiện có. `HorseInjuryMapping.jsx` dùng `HorseInjuryDiagram.jsx`. Ảnh PNG nền trong suốt, path tương tác và marker đều nằm trong cùng một SVG, không phụ thuộc hotlink hoặc dependency đồ họa. Đã xóa viewer/engine/demo không dùng, dependency `three`, test và CSS tương ứng. Nguồn ảnh và prompt: [asset README](../public/images/injury/README.md).

Đã đối chiếu `VetMedicalProfile`, `VetClinicalExam`, `useClinicalWarning`, `apiClient`, `horseApi`, `vetApi`, `App`, cùng `backend/apps/medical/{models,serializers,views,services,urls}.py` và tài liệu API. BE hiện có `MedicalRecord.InjuryLocation` dạng chữ, `Draft`/`Signed`, quyền `HORSE_VIEW`, `MEDICAL_MANAGE`, `MEDICAL_SIGN`; chưa có model/endpoint marker hoặc đánh giá phục hồi. Không sửa BE/schema, không gọi endpoint phỏng đoán.

## Hành vi

- Hai góc **Bên trái ngựa / Bên phải ngựa** luôn chỉ bên cơ thể ngựa. Hiện chỉ có một ảnh tham chiếu, bên phải được ghi rõ là ảnh lật minh họa, không phải ảnh chụp thực tế của bên đó. Marker chỉ được vẽ tại tọa độ đã lưu của đúng `view`; không sao chép hoặc phản chiếu marker giữa hai bên.
- Tám mã vùng ổn định: `head`, `neck`, `shoulder`, `back`, `abdomen`, `hindquarters`, `foreleg`, `hindleg`. Nhãn chân đi kèm bên cơ thể; không suy chân trái/phải từ vị trí màn hình.
- Chế độ xem không tạo marker. Người có `MEDICAL_MANAGE` trong demo mới có chế độ thêm; chọn vùng bằng chuột, chạm, Enter/Space hoặc danh sách vùng. Path bám theo ảnh mới; kiểm tra alpha thêm để không đặt điểm vào nền/khoảng trống giữa các chân. Vùng mặc định trong suốt, không chia viền; hover/focus/selected chỉ phủ xanh 11% và viền mảnh, có nhãn tiếng Việt. Ảnh có lỗi/thiếu sẽ khóa đặt điểm, có thông báo và thử lại.
- Click được đổi qua `getScreenCTM().inverse()` sang không gian `viewBox` 1448×1086, lưu `xRatio/yRatio` trong [0,1]. Ảnh dùng `preserveAspectRatio="xMidYMid meet"`, không kéo giãn hoặc crop; marker là phần tử SVG, số luôn thẳng kể cả khi lật ảnh. Khung có cùng tỉ lệ với SVG, giữ vị trí khi resize/cuộn/reload; không lưu pixel. Danh sách vùng/bàn phím dùng điểm neo nằm trong vùng tương ứng.
- Marker có số thứ tự ổn định, trạng thái, highlight, tooltip trên desktop. Mobile chạm mở chi tiết. Danh sách cho phép chọn các marker chồng nhau và chuyển đúng bên cơ thể. Bộ lọc vùng/mức độ/tình trạng áp dụng cả danh sách và sơ đồ; phân biệt chưa có dữ liệu và không khớp bộ lọc.
- Form dùng ngựa từ hồ sơ hiện tại; vùng/bên/góc nhìn lấy từ sơ đồ; không nhập tự do tên ngựa. Có liên kết phiếu, mô tả, mức độ, ngày, tình trạng, ghi chú; không tạo chẩn đoán/phác đồ trùng bệnh án. Validation tiếng Việt sát trường, giữ form khi lỗi lưu, chặn gửi trùng, hủy bỏ marker tạm, đổi vị trí có bước lưu và xóa có xác nhận nêu mô tả.
- Phiếu `Signed` không sửa/xóa/đổi vị trí hoặc đổi liên kết phiếu. Theo dõi tạo entry mới trên phiếu tái khám `Draft` khác phiếu ban đầu. Mỗi entry giữ ngày theo dõi, thời gian ghi, người ghi, tình trạng, nhận xét và phiếu liên quan; không ghi đè lịch sử hoặc tình trạng ghi nhận ban đầu. Demo giữ lại chấn thương đã có lịch sử, không cho xóa.
- Quyền được kiểm tra tại UI, handler và demo repository. Đổi user/CLB/ngựa tạo context mới, không lộ dữ liệu context cũ. Cảnh báo chưa lưu dùng guard hiện có, bao gồm nội dung theo dõi. Không thay đổi route/quyền truy cập hồ sơ của dự án.

## API thật và demo

**Mặc định:** sơ đồ chỉ xem, thông báo lưu chưa hỗ trợ. Bệnh án chữ và khóa tập vẫn đọc API thật hiện có, giữ liên kết xem bệnh án và workflow khóa tập. Dữ liệu chữ không được tự chuyển thành tọa độ SVG. Lưu marker không tác động kết luận khám hoặc khóa tập.

**Bật demo rõ ràng:** thêm vào `frontend/.env.local`, khởi động lại Vite:

```dotenv
VITE_INJURY_DIAGRAM_DEMO=true
```

Sau đó bấm **Mở dữ liệu minh họa**. Cấu hình mặc định trong `.env.example` là `false`; không tự bật demo nếu API lỗi. Sau reload, cần bấm mở demo lại, các dữ liệu demo đã lưu được giữ nguyên.

`src/api/injuryDiagramRepository.js` cô lập truy cập dữ liệu, có các thao tác `list/save/remove/appendAssessment`. Chế độ thật hiện trả khả năng lưu chưa hỗ trợ và không mở bộ lưu demo. Sau này chỉ thay adapter khi có contract BE đã thống nhất.

Demo dùng localStorage key `equi.injury-diagram.demo:[userId,clubId,horseId,diagramVersion]`. Payload chỉ có `horseId: demo-horse`, các phiếu giả `demo-draft/demo-signed/demo-followup`, tác giả cố định **Bác sĩ minh họa** và nội dung minh họa. Không sao chép tên ngựa, ID bệnh án thật, ghi chú bệnh án hoặc token vào payload. ID user/CLB/ngựa chỉ dùng phân phạm vi key. UI nhắc **Dữ liệu minh họa, chưa đồng bộ máy chủ**, chỉ nhập nội dung giả; đây không phải nơi lưu hồ sơ y tế. Các field tự nhập chỉ dành cho nội dung giả.

Lỗi đọc/JSON sai được báo và có retry; không xóa/reset dữ liệu lỗi thành ví dụ. Lỗi localStorage quota/privacy không báo thành công. Demo không đồng bộ nhiều thiết bị hoặc xử lý xung đột nhiều tab.

**Đổi phiên bản ảnh:** `equi-horse-photo-v2` thay hình vẽ `equi-horse-side-v1`. Chỉ đọc metadata từ key v1 khi chưa có snapshot v2, giữ nguyên version/tọa độ/nội dung/lịch sử cũ; không ghi storage trong thao tác đọc. Marker khác phiên bản hiện trong danh sách với thông báo cần đặt lại, không vẽ trên ảnh. Vet chỉ đặt lại vị trí của phiếu Draft bằng “Đổi vị trí” rồi lưu rõ ràng. Snapshot v2 giữ metadata chưa đặt lại, và key v1 không bị sửa/xóa. Phiếu Signed vẫn chỉ xem, theo dõi bổ sung bằng bản ghi mới. Không chuyển tọa độ từ không gian khác sang tọa độ SVG.

**Cấu hình ảnh:** mặc định dùng `public/images/injury/horse-reference-cutout-v2.png` (RGBA, 1448×1086, từ ảnh tham chiếu người dùng, xử lý bằng built-in imagegen). Có thể cấu hình `VITE_INJURY_HORSE_LEFT_IMAGE` và `VITE_INJURY_HORSE_RIGHT_IMAGE` với đường dẫn PNG/WebP cùng origin. Không chấp nhận URL ngoài. Ảnh thay thế cần căn đúng canvas/tư thế của profile; phải vẽ lại path/điểm neo và tăng `diagramVersion` khi đổi hình học. Ảnh riêng bên phải cần căn theo canvas hướng đầu sang trái; cấu hình tách `mirrorImage` và `mirrorRegions`, không lật lại một ảnh riêng đã căn. Chưa có ảnh chụp riêng bên phải hoặc bản đồ giải phẫu được thú y nghiệm thu.

## Yêu cầu BE cần thống nhất (chưa triển khai)

| Thao tác/quy tắc | Yêu cầu |
|---|---|
| Đọc marker | Theo ngựa và CLB được phép; trả trạng thái phiếu, quyền sửa, phiên bản sơ đồ; phân trang nếu cần |
| Tạo/sửa/xóa | `MEDICAL_MANAGE`, phạm vi ngựa–CLB–phiếu, chủ phiếu nháp theo quy tắc BE hiện có; kiểm tra lại trên server |
| Phiếu đã chốt | Không sửa/xóa marker gốc; bổ sung qua bản ghi/phiếu mới, giữ snapshot lịch sử |
| Theo dõi phục hồi | Append-only, tác giả và thời gian do server tạo; liên kết phiếu tái khám hợp lệ; thống nhất quy tắc xóa khi có lịch sử |
| Xung đột và audit | ID server, revision/concurrency, người/thời gian thao tác; lỗi validation/quyền/phiếu đã chốt rõ ràng |
| Tọa độ | Validate region, side/view, diagramVersion được chấp nhận và tọa độ hữu hạn trong vùng cơ thể; có chính sách phiên bản cũ |

Cấu trúc **đề xuất** marker: `id, horseId, medicalRecordId, bodyRegion, bodySide, view, xRatio, yRatio, diagramVersion, description, severity, detectedAt, status, notes`. Entry phục hồi đề xuất: `id, date, at, status, comment, author, medicalRecordId`. Không gửi bất kỳ trường nào cho BE trước khi contract được chốt.

`diagramVersion = equi-horse-photo-v2`; side/view: `left | right`. Enum mức độ `mild | moderate | severe`, tình trạng `treating | monitoring | recovered` được cô lập trong `injuryDomain.js`, tái xuất tại `injuryDiagramDomain.js`; chỉ là đề xuất cho demo, không phải enum BE. Không đồng nhất với `MedicalRecord.HealthStatus` hoặc `HealthReport.Severity`.

Không tuyên bố FE đã bảo vệ thao tác server: chưa có API marker để kiểm chứng RBAC, Signed hoặc persistence thật. Cần BE bổ sung trước khi dùng cho dữ liệu lâm sàng.

## Kiểm thử

```powershell
# từ frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:api
npm.cmd run test:injury
npm.cmd run build
npx.cmd oxlint src/components/injury src/api/injuryDiagramRepository.js tests/injuryDiagram.test.mjs tests/injury.browser.mjs
```

Browser dùng Chrome thật và Django trên SQLite/media tạm riêng, không dùng database SQL Server dự án:

```powershell
# Terminal 1, từ backend
.\.venv\Scripts\python.exe -m apps.core.tests.browser_fixture

# Terminal 2, từ frontend
$env:VITE_API_PROXY_TARGET='http://127.0.0.1:8001'
$env:VITE_INJURY_DIAGRAM_DEMO='true'
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort

# Terminal 3, từ frontend
$env:BROWSER_ARTIFACT_DIR='C:\Equine_Project\frontend\artifacts\injury-photo'
node tests/injury.browser.mjs
```

Kiểm tra demo bị tắt: chạy Vite khác tại 5175 với `VITE_INJURY_DIAGRAM_DEMO=false`, chạy cùng browser test với `BROWSER_BASE_URL=http://127.0.0.1:5175`, `BROWSER_DEMO=false`. Test không tự chỉnh cấu hình local của người dùng.

Kết quả kiểm tra 26/10/2026: 15 unit tests chấn thương (2 kiểm tra khóa tập + 13 kiểm tra sơ đồ/dữ liệu), 26 API tests; Chrome suite demo bật/tắt đã chạy. Bao phủ chọn vùng chuột/phím/form, đúng bên, tọa độ ở 1440/1024/834/390 px và sau cuộn, mobile touch, tạo/hủy/sửa/đổi vị trí/xóa, marker chồng, validation, lỗi lưu/gửi trùng, phiếu đã chốt, lịch sử append-only, bộ lọc/số marker, reload, handler chỉ xem, đổi ngựa, JSON lỗi/retry và API đọc lỗi không tự chuyển demo. Xác nhận không ghi API bệnh án/khóa tập từ thao tác marker; dữ liệu bệnh án/khóa thật của fixture giữ nguyên. Bổ sung kiểm tra ảnh trong suốt, điểm neo trên pixel thân ngựa, khe chân/alpha rỗng, lỗi ảnh/thử lại, click marker khi đang thêm và marker khác phiên bản không tự hiển thị; đặt lại vị trí chỉ sửa snapshot mới, giữ nguyên byte dữ liệu phiên bản cũ. Không kiểm thử persistence marker trên API thật vì API chưa có.

Ảnh tại `frontend/artifacts/injury-photo/`. Typecheck/build qua; lint phần thay đổi không cảnh báo. Lint toàn dự án còn cảnh báo ngoài phạm vi; build còn cảnh báo bundle lớn. Sơ đồ là minh họa vị trí ngoài da, chưa phải bản đồ giải phẫu được chuyên gia thú y nghiệm thu.
