-- Create Organization Levels (ระดับองค์กร)
-- สาขา → สำนัก → ฝ่าย → แผนก

-- ตรวจสอบว่าตาราง OrganizationLevels มีอยู่หรือยัง
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'OrganizationLevels')
BEGIN
    CREATE TABLE OrganizationLevels (
        level_id INT IDENTITY(1,1) PRIMARY KEY,
        level_code NVARCHAR(20) NOT NULL UNIQUE,
        level_name_th NVARCHAR(100) NOT NULL,
        level_name_en NVARCHAR(100),
        level_order INT NOT NULL,
        description NVARCHAR(500),
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    PRINT 'Created table: OrganizationLevels';
END
ELSE
BEGIN
    PRINT 'Table OrganizationLevels already exists';
END
GO

-- ลบข้อมูลเก่า (ถ้ามี)
DELETE FROM OrganizationLevels;
DBCC CHECKIDENT ('OrganizationLevels', RESEED, 0);
GO

-- Insert Organization Levels
INSERT INTO OrganizationLevels (level_code, level_name_th, level_name_en, level_order, description, is_active)
VALUES
    ('BRANCH', 'สาขา', 'Branch', 1, 'ระดับสาขา - ระดับบนสุดของโครงสร้าง', 1),
    ('OFFICE', 'สำนัก', 'Office', 2, 'ระดับสำนัก - อยู่ภายใต้สาขา', 1),
    ('DIVISION', 'ฝ่าย', 'Division', 3, 'ระดับฝ่าย - อยู่ภายใต้สำนัก', 1),
    ('DEPARTMENT', 'แผนก', 'Department', 4, 'ระดับแผนก - ระดับล่างสุด มีตำแหน่งงานสังกัด', 1);
GO

-- แสดงผลลัพธ์
SELECT * FROM OrganizationLevels ORDER BY level_order;
GO

PRINT 'Organization Levels seeded successfully!';
PRINT '';
PRINT 'Structure: สาขา (BRANCH) -> สำนัก (OFFICE) -> ฝ่าย (DIVISION) -> แผนก (DEPARTMENT) -> ตำแหน่งงาน (POSITION)';
