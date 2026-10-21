-- Quản trị & thông báo đã đọc: thêm bảng NotificationRead cho database ĐÃ CÓ dữ liệu.
-- (database mới chỉ cần chạy horse_v2.sql). Chạy lại nhiều lần không sao.
-- Các chức năng quản trị khác (gán role, khóa tài khoản, bảng phân quyền, nhật ký) dùng bảng có sẵn.

IF OBJECT_ID('dbo.NotificationRead', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.NotificationRead
    (
        UserID INT NOT NULL,
        NotificationKey NVARCHAR(200) NOT NULL,
        ReadAt DATETIME2 NOT NULL CONSTRAINT DF_NotificationRead_ReadAt DEFAULT SYSDATETIME(),

        CONSTRAINT PK_NotificationRead PRIMARY KEY (UserID, NotificationKey),
        CONSTRAINT FK_NotificationRead_User FOREIGN KEY (UserID)
            REFERENCES dbo.[User](UserID)
    );
END;
GO
