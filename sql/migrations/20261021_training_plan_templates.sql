-- Flow 2 - giáo án mẫu theo chuyên môn, cho database ĐÃ CÓ dữ liệu (database mới chỉ cần chạy horse_v2.sql).
-- Chạy lại nhiều lần không sao. Sau đó chạy `python manage.py seed_demo` (hoặc mở danh sách giáo án mẫu)
-- để có 5 giáo án mẫu mặc định cho mỗi CLB.

IF OBJECT_ID('dbo.TrainingPlanTemplate', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrainingPlanTemplate
    (
        TemplateID INT IDENTITY(1,1) PRIMARY KEY,
        ClubID INT NOT NULL,
        SpecializationID INT NOT NULL,
        TemplateName NVARCHAR(150) NOT NULL,
        Goal NVARCHAR(1000),
        DurationDays INT NOT NULL,
        OverallIntensity VARCHAR(30),
        DailyStructure NVARCHAR(2000),
        WeeklyPattern NVARCHAR(2000),
        Note NVARCHAR(2000),
        IsActive BIT NOT NULL CONSTRAINT DF_TrainingPlanTemplate_Active DEFAULT 1,
        UpdatedBy INT NULL,
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_TrainingPlanTemplate_UpdatedAt DEFAULT SYSDATETIME(),
    
        CONSTRAINT FK_TrainingPlanTemplate_Club FOREIGN KEY (ClubID)
            REFERENCES dbo.Club(ClubID),
        CONSTRAINT FK_TrainingPlanTemplate_Spec FOREIGN KEY (SpecializationID)
            REFERENCES dbo.Specialization(SpecializationID),
        CONSTRAINT FK_TrainingPlanTemplate_UpdatedBy FOREIGN KEY (UpdatedBy)
            REFERENCES dbo.[User](UserID),
        CONSTRAINT UQ_TrainingPlanTemplate_Club_Spec UNIQUE (ClubID, SpecializationID),
        CONSTRAINT CK_TrainingPlanTemplate_Duration CHECK (DurationDays > 0),
        CONSTRAINT CK_TrainingPlanTemplate_Intensity CHECK
        (
            OverallIntensity IS NULL OR OverallIntensity IN ('Low', 'Moderate', 'High', 'Very High')
        )
    );
END;
GO

IF OBJECT_ID('dbo.TrainingPlanTemplateStage', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrainingPlanTemplateStage
    (
        TemplateStageID INT IDENTITY(1,1) PRIMARY KEY,
        TemplateID INT NOT NULL,
        StageOrder INT NOT NULL,
        StageName NVARCHAR(100) NOT NULL,
        Goal NVARCHAR(1000),
        StartDay INT NOT NULL,
        DurationDays INT NOT NULL,
        Intensity VARCHAR(30),
        TrainingLoad DECIMAL(10,2) NULL,
        DistanceTargetKm DECIMAL(10,2) NULL,
        Surface VARCHAR(50),
        Note NVARCHAR(1500),
        ExitCriteria NVARCHAR(1000),
    
        CONSTRAINT FK_TemplateStage_Template FOREIGN KEY (TemplateID)
            REFERENCES dbo.TrainingPlanTemplate(TemplateID),
        CONSTRAINT UQ_TemplateStage_Order UNIQUE (TemplateID, StageOrder),
        CONSTRAINT CK_TemplateStage_Days CHECK (StageOrder > 0 AND StartDay >= 1 AND DurationDays > 0),
        CONSTRAINT CK_TemplateStage_Intensity CHECK
        (
            Intensity IS NULL OR Intensity IN ('Low', 'Moderate', 'High', 'Very High')
        )
    );
END;
GO

IF COL_LENGTH('dbo.TrainingPlan', 'TemplateID') IS NULL
    ALTER TABLE dbo.TrainingPlan ADD TemplateID INT NULL;
GO
IF OBJECT_ID('dbo.FK_TrainingPlan_Template', 'F') IS NULL
    ALTER TABLE dbo.TrainingPlan ADD CONSTRAINT FK_TrainingPlan_Template
        FOREIGN KEY (TemplateID) REFERENCES dbo.TrainingPlanTemplate(TemplateID);
GO
