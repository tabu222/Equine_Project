# Bản đồ chấn thương — 26/10/2026

## Phạm vi và tích hợp

Mở `/vet/horses/:id?tab=injuries`. Tab **Chấn thương và phục hồi** trong `VetMedicalProfile.jsx` dùng `components/injury/HorseInjuryMapping.jsx`. Sidebar, header ứng dụng và route giữ nguyên. Ảnh đại diện hồ sơ dùng kích thước `small` sẵn có để tránh ảnh gốc chiếm hết chiều rộng.

Source hiện dùng React 19, React Router 7, Vite, JavaScript/TypeScript, CSS thuần và SVG nét mảnh; không có UI framework. Giao diện mới tái sử dụng token nền, chữ, surface, border, radius, trạng thái và focus; các màu olive/marker riêng được giới hạn trong `.horse-injury-mapping`.

Đã đối chiếu `horseApi.ts`, `vetApi.ts`, `useVetResource.js`, `VetOperations.jsx`, model/serializer MedicalRecord và `sql/horse_v2.sql`. Backend chỉ có `MedicalRecord.InjuryLocation` dạng chữ; chưa có API marker hoặc asset `.glb/.gltf`. Không sửa backend, API hoặc SQL.

## Hành vi đã triển khai

- Layout hai cột khoảng 65/35, xếp dọc trên tablet hẹp; tên/mã ngựa, sức khỏe, điều kiện tập, số dấu dùng thử; danh sách vị trí nằm dưới viewer và panel chi tiết nằm bên phải.
- Viewer Three.js tải riêng bằng dynamic import khi cấu hình asset. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) tải một mô hình bề mặt nguyên con; vật liệu trung tính, không phát animation, không có lớp cơ/xương. [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html) hỗ trợ xoay, zoom và pan; preset trái/phải/chính diện/phía sau/đặt lại.
- Raycast lên mesh để lấy tọa độ glTF scene. Tọa độ không bị thay đổi khi frame/resize/zoom. Marker HTML được chiếu từ điểm 3D mỗi lần camera đổi, có kiểm tra che khuất bằng mesh, viền trắng, tooltip, trạng thái và highlight. Không lưu pixel màn hình.
- Chọn danh sách mở panel và chuyển camera theo hướng nhìn lúc tạo dấu. Tên vùng cơ thể do bác sĩ nhập, không tự suy chẩn đoán từ tọa độ.
- Pointer phải cùng ID và di chuyển tối đa 5 px mới chọn bề mặt; một khi đã kéo, kéo trở lại điểm đầu cũng không tạo dấu. Gesture nhiều ngón bị loại khỏi thao tác tạo dấu.
- Form vị trí, mô tả, mức độ, trạng thái, ngày phát hiện và ghi chú; validation, lưu/hủy, xác nhận xóa, thông báo thành công/lỗi, giữ nội dung nếu lưu lỗi. Dùng `useClinicalWarning` hiện tại cho chuyển route/tab và đóng/tải lại trang; đổi vị trí/hủy/thoát dùng thử cũng kiểm tra nội dung chưa lưu.
- Chỉ người có `MEDICAL_MANAGE` được sửa **trong chế độ dùng thử**. Người khác xem danh sách/panel với fieldset khóa và không có nút lưu/xóa.
- Giữ toàn bộ thông tin chấn thương bằng chữ từ bệnh án thật: vị trí, chẩn đoán, điều trị, sức khỏe, điều kiện tập, bác sĩ, ngày khám, ngày tái khám và liên kết đúng phiếu.

## Dữ liệu thật và dùng thử

Mặc định không vẽ hoặc ghi marker lâm sàng vì chưa có API hỗ trợ. Viewer báo **Đang chờ mô hình ngựa 3D** khi chưa cấu hình asset; thiếu dữ liệu 3D được phân biệt với kết quả không có chấn thương. Các nút góc nhìn được khóa cho đến khi tải mô hình thành công. Có trạng thái loading, lỗi asset/WebGL và thử lại.

Nút **Dùng thử giao diện** mở kho nhớ riêng tại `src/mock/injuryMarkers.js`. Không gọi API ghi, không dùng localStorage/sessionStorage/IndexedDB. Kho nhớ tách theo người dùng, CLB, ngựa và phiên bản model; xem lại được sau khi đóng/mở tab hồ sơ trong cùng phiên trang, mất khi reload. Thông báo lưu luôn nói rõ đây là dấu dùng thử, chưa ghi vào bệnh án.

Khi **chưa có asset**, hai dấu minh họa dùng `illustrative-points-v1` chỉ để thử danh sách và form; không vẽ chúng lên một con ngựa giả. Khi **có asset**, kho dùng thử của phiên bản asset bắt đầu trống; chỉ click lên bề mặt mô hình đã tải mới tạo tọa độ dùng thử. Không gắn các điểm minh họa tùy ý lên asset thật.

## Điều kiện huấn luyện

Đọc `/training-locks?HorseID=…` qua adapter phân trang và phân quyền hiện có. Lệnh `Active` mức `Full` ưu tiên hơn `Restricted` và kết luận `Eligible`. Không tự hết khóa theo ngày dự kiến. Nếu không có khóa, đối chiếu bệnh án **Signed** gần nhất; bệnh án Draft không thay kết luận đã chốt. Không đồng nhất trạng thái sức khỏe với quyền tập. Lỗi/loading khóa và thiếu kết luận luôn hiển thị chưa xác định; không hiển thị đủ điều kiện tập khi thiếu bằng chứng.

Alert có lý do, bác sĩ ban hành, thời gian bắt đầu, tải tối đa hoặc chỉ định tái khám khi có dữ liệu. Không coi LockEndDate là ngày tái khám. Link trong alert trỏ đến `TrainingLocks` hiện tại ở cuối tab. Quyền `TRAINING_LOCK_MANAGE`, xác nhận và điều kiện mở khóa vẫn thuộc workflow đó. Sau khi thao tác khóa trong workflow này, alert tải lại dữ liệu; lưu/xóa marker không gọi workflow khóa.

## Asset còn cần cung cấp

Đặt asset dưới `frontend/public/models/` hoặc URL được phép truy cập. Cấu hình cả hai biến trong `.env.local`, sau đó khởi động lại Vite:

```dotenv
VITE_HORSE_MODEL_URL=/models/horse-v1.glb
VITE_HORSE_MODEL_VERSION=horse-surface-v1
```

Yêu cầu bàn giao:

- glTF 2.0 `.glb` tự chứa được ưu tiên; `.gltf` cần đủ `.bin` và texture liên quan, URL/CORS hợp lệ. Viewer hiện dùng GLTFLoader tiêu chuẩn; asset nén Draco/Meshopt/KTX2 cần bổ sung decoder trước khi sử dụng.
- Một ngựa nguyên con ở tư thế tĩnh, đủ chi tiết bề mặt để bác sĩ định vị, có giấy phép sử dụng. Không cần skeleton/animation hoặc lớp giải phẫu.
- Hệ tọa độ scene cố định: mét, +Y hướng lên, đầu ngựa hướng +X, bên trái ngựa là +Z. Gốc scene đặt ở mặt đất giữa ngựa theo X/Z. Cung cấp kích thước/bounds và xác nhận hướng trái/phải bởi người phụ trách asset.
- Giữ nguyên scene transforms, topology và origin theo mỗi modelVersion. Đổi asset ảnh hưởng tọa độ phải đổi modelVersion; không tái sử dụng marker của phiên bản cũ. Viewer thay camera để frame, không normalize/scale/di chuyển scene gốc.

Chưa nghiệm thu vị trí giải phẫu, che khuất trên thân/ngón chân hoặc hiệu năng asset ngựa thực tế vì repository chưa có tệp đó. Hình tam giác trong browser test là fixture riêng, chỉ kiểm tra renderer/toạ độ; không được phân phối hoặc xem là mô hình ngựa hoàn chỉnh.

## Đề xuất contract marker cho backend — chưa triển khai

Đây là đề xuất để thống nhất tiếp, không phải API hiện đang tồn tại. Cần xác nhận contract và quyền backend trước khi thay kho dùng thử bằng adapter thật.

```json
{
  "id": "server-generated",
  "horseId": "123",
  "medicalRecordId": "456",
  "modelVersion": "horse-surface-v1",
  "point": { "x": 0.85, "y": 0.6, "z": 0.3 },
  "viewHint": "left",
  "location": "Chân trước trái",
  "description": "Mô tả do bác sĩ nhập",
  "severity": "moderate",
  "status": "treating",
  "detectedAt": "2026-10-26",
  "notes": "Ghi chú do bác sĩ nhập",
  "revision": 1
}
```

`severity`: `mild | moderate | severe`; `status`: `treating | monitoring | recovered`. `viewHint` chỉ hỗ trợ camera, không phải kết luận vùng cơ thể. Point thuộc **glTF scene space** sau transforms tĩnh của các node con, trước mọi camera/view transform. Không làm tròn hoặc chuyển sang tọa độ mesh con/pixel. Backend cần kiểm tra 3 số hữu hạn, bounds/bề mặt và modelVersion được chấp nhận.

Có thể cung cấp GET/POST `/horses/:id/injury-markers` và PATCH/DELETE `/injury-markers/:id` sau khi được thống nhất. Cần RBAC tại server, cùng ngựa–bệnh án–CLB, audit người/thời gian, revision để tránh ghi đè đồng thời, lịch sử đánh giá phục hồi và quy tắc xóa. Không suy trạng thái/sức khỏe/mức độ từ vị trí; mọi mutation marker độc lập với khóa tập. Khi có API phải kiểm tra lưu/reload bằng người dùng khác đúng quyền và tải lại đúng asset version.

## Kiểm thử

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:api
npm.cmd run test:injury
npm.cmd run build
```

Browser dùng Chrome thật và Django SQLite/media tạm của fixture sẵn có. Không dùng dữ liệu SQL Server thật:

```powershell
# Terminal 1, từ backend
.\.venv\Scripts\python.exe -m apps.core.tests.browser_fixture

# Terminal 2, từ frontend
$env:VITE_API_PROXY_TARGET='http://127.0.0.1:8001'
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort

# Terminal 3, từ frontend; bỏ cấu hình model nếu có để kiểm tra default thiếu asset
$env:BROWSER_ARTIFACT_DIR='C:\Equine_Project\frontend\artifacts\injury'
node tests/injury.browser.mjs
```

Unit kiểm tra ưu tiên khóa, lỗi/loading, tọa độ hợp lệ, click/drag và kho dùng thử tách phạm vi. Browser kiểm tra dữ liệu thật của fixture, giữ khóa/bệnh án qua các thao tác marker, quyền chỉ xem, lưu/xóa/chọn lại, cảnh báo rời tab, không ghi API hoặc browser storage y tế; desktop 1440, tablet 1024/834 và mobile 390 không tràn ngang. Renderer được kiểm tra bằng glTF hình học tổng hợp có node transform để xác nhận chọn tọa độ scene và loại thao tác kéo.

Kết quả 26/10/2026: typecheck, build, 26 API tests, 5 injury unit tests và browser suite đều qua. Browser còn xác nhận tooltip/focus, highlight/chọn marker React, active preset, lỗi tải asset/thử lại và tải lại alert sau khi điều chỉnh khóa qua workflow chuyên biệt.

Ảnh kiểm thử nằm trong `frontend/artifacts/injury/`. Lint toàn repository vẫn có cảnh báo sẵn có ngoài phạm vi; các file mới và `VetMedicalProfile.jsx` phải qua lint riêng không cảnh báo. Build báo bundle lớn, trong đó Three.js nằm ở chunk riêng và chỉ tải khi có asset.

## Tệp thay đổi

- `src/pages/vet/VetMedicalProfile.jsx`: tích hợp tab, kích thước avatar và tín hiệu tải lại khóa.
- `src/components/injury/HorseInjuryMapping.jsx`, `HorseInjuryMapping.css`: bố cục, dữ liệu thật/dùng thử, trạng thái và điều phối form.
- `src/components/injury/Horse3DViewer.jsx`, `horseScene.js`, `InjuryMarker.jsx`: tải asset, camera, raycast, chiếu/che khuất marker và giải phóng tài nguyên.
- `src/components/injury/InjuryDetailPanel.jsx`, `InjuryMarkerList.jsx`, `TrainingRestrictionAlert.jsx`, `InjuryIcon.jsx`, `injuryDomain.js`: panel, danh sách, alert, icon và quy tắc hiển thị.
- `src/mock/injuryMarkers.js`: dữ liệu/kho nhớ dùng thử độc lập.
- `package.json`, `package-lock.json`, `.env.example`: dependency Three.js, lệnh unit test và cấu hình asset mẫu.
- `tests/injury.test.mjs`, `tests/injury.browser.mjs`, `artifacts/injury/*.png`: kiểm thử và ảnh minh chứng.
- `README.md`, `docs/HORSE_INJURY_MAPPING.md`: hướng dẫn và bàn giao.
