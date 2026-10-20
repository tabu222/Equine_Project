-- Flow 4 - khẩu phần theo giáo án + việc chăm sóc tự sinh theo chỉ tiêu, cho database ĐÃ CÓ dữ liệu
-- (database mới chỉ cần chạy horse_v2.sql). Chạy lại nhiều lần không sao.
--   1. DietPlan.TrainingPlanID: giáo án đang chạy lúc lập khẩu phần.
--   2. CareTask.RuleCode, SourceKey (+ index không trùng): việc do hệ thống sinh.
--   3. Bảng CareTaskRule (chỉ tiêu của CLB) và HorseGroom (Groom phụ trách ngựa).

IF COL_LENGTH('dbo.DietPlan', 'TrainingPlanID') IS NULL
    ALTER TABLE dbo.DietPlan ADD TrainingPlanID INT NULL;
GO
IF OBJECT_ID('dbo.FK_DietPlan_TrainingPlan', 'F') IS NULL
    ALTER TABLE dbo.DietPlan ADD CONSTRAINT FK_DietPlan_TrainingPlan
        FOREIGN KEY (TrainingPlanID) REFERENCES dbo.TrainingPlan(TrainingPlanID);
GO

IF COL_LENGTH('dbo.CareTask', 'RuleCode') IS NULL
    ALTER TABLE dbo.CareTask ADD RuleCode VARCHAR(40) NULL;
GO
IF COL_LENGTH('dbo.CareTask', 'SourceKey') IS NULL
    ALTER TABLE dbo.CareTask ADD SourceKey VARCHAR(120) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_CareTask_Source' AND object_id = OBJECT_ID('dbo.CareTask'))
    CREATE UNIQUE INDEX UX_CareTask_Source ON dbo.CareTask(HorseID, SourceKey) WHERE SourceKey IS NOT NULL;
GO

IF OBJECT_ID('dbo.CareTaskRule', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CareTaskRule
    (
        CareTaskRuleID INT IDENTITY(1,1) PRIMARY KEY,
        ClubID INT NOT NULL,
        RuleCode VARCHAR(40) NOT NULL,
        TaskType VARCHAR(50) NOT NULL,
        Title NVARCHAR(150) NOT NULL,
        TimeOfDay TIME NULL,
        OffsetMinutes INT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_CareTaskRule_Active DEFAULT 1,
        UpdatedBy INT NULL,
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_CareTaskRule_UpdatedAt DEFAULT SYSDATETIME(),

        CONSTRAINT FK_CareTaskRule_Club FOREIGN KEY (ClubID) REFERENCES dbo.Club(ClubID),
        CONSTRAINT FK_CareTaskRule_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES dbo.[User](UserID),
        CONSTRAINT UQ_CareTaskRule_Club_Code UNIQUE (ClubID, RuleCode),
        CONSTRAINT CK_CareTaskRule_Code CHECK
            (RuleCode IN ('FEEDING_BY_DIET', 'DAILY_CLEANING', 'BATH_AFTER_TRAINING', 'ICE_SOAK_WHEN_LOCKED')),
        CONSTRAINT CK_CareTaskRule_Type CHECK (TaskType IN ('Feeding', 'Cleaning', 'Bathing', 'Ice Leg Soak')),
        CONSTRAINT CK_CareTaskRule_Offset CHECK (OffsetMinutes IS NULL OR OffsetMinutes >= 0)
    );
END;
GO

IF OBJECT_ID('dbo.HorseGroom', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.HorseGroom
    (
        HorseID INT NOT NULL PRIMARY KEY,
        GroomID INT NOT NULL,
        AssignedBy INT NULL,
        AssignedAt DATETIME2 NOT NULL CONSTRAINT DF_HorseGroom_AssignedAt DEFAULT SYSDATETIME(),

        CONSTRAINT FK_HorseGroom_Horse FOREIGN KEY (HorseID) REFERENCES dbo.Horse(HorseID),
        CONSTRAINT FK_HorseGroom_Groom FOREIGN KEY (GroomID) REFERENCES dbo.[User](UserID),
        CONSTRAINT FK_HorseGroom_AssignedBy FOREIGN KEY (AssignedBy) REFERENCES dbo.[User](UserID)
    );
END;
GO
