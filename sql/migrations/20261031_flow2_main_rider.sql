-- Flow 2 - kỵ sĩ chính, chuyên môn Work Rider, HLV trưởng không xếp buổi tập hằng ngày.
-- Cho database ĐÃ CÓ dữ liệu (database mới chỉ cần chạy horse_v2.sql). Chạy lại nhiều lần không sao.

IF OBJECT_ID('dbo.WorkRiderSpecialization', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.WorkRiderSpecialization
    (
        WorkRiderID INT NOT NULL,
        SpecializationID INT NOT NULL,
        AssignedAt DATETIME2 NOT NULL CONSTRAINT DF_WorkRiderSpecialization_AssignedAt DEFAULT SYSDATETIME(),

        CONSTRAINT PK_WorkRiderSpecialization PRIMARY KEY (WorkRiderID, SpecializationID),
        CONSTRAINT FK_WorkRiderSpecialization_Rider FOREIGN KEY (WorkRiderID)
            REFERENCES dbo.[User](UserID),
        CONSTRAINT FK_WorkRiderSpecialization_Specialization FOREIGN KEY (SpecializationID)
            REFERENCES dbo.Specialization(SpecializationID)
    );
END;
GO

-- Head Trainer không còn quyền xếp / sửa buổi tập (Trainer phụ trách làm; HLV trưởng chọn người giám sát thay)
DELETE rp
FROM dbo.RolePermission rp
JOIN dbo.Role r ON r.RoleID = rp.RoleID
JOIN dbo.Permission p ON p.PermissionID = rp.PermissionID
WHERE r.RoleCode = 'HEAD_TRAINER' AND p.PermissionCode = 'TRAINING_SESSION_ASSIGN';
GO

UPDATE dbo.Role
SET Description = N'Đánh giá ngựa, phân công Trainer và kỵ sĩ chính, duyệt giáo án, chọn người giám sát thay.'
WHERE RoleCode = 'HEAD_TRAINER';
GO
