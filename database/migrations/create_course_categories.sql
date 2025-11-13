-- Create CourseCategories table
-- This table stores course categories for organizing courses

-- Drop table if exists
IF OBJECT_ID('dbo.CourseCategories', 'U') IS NOT NULL
    DROP TABLE dbo.CourseCategories;
GO

CREATE TABLE CourseCategories (
    category_id INT PRIMARY KEY IDENTITY(1,1),
    category_name NVARCHAR(100) NOT NULL,
    category_name_en NVARCHAR(100),
    description NVARCHAR(500),
    category_icon NVARCHAR(50), -- Font Awesome icon class (e.g., 'fa-laptop-code')
    category_color NVARCHAR(20), -- Hex color code (e.g., '#3b82f6')
    display_order INT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by INT,
    updated_by INT,

    CONSTRAINT FK_CourseCategories_CreatedBy FOREIGN KEY (created_by) REFERENCES Users(user_id),
    CONSTRAINT FK_CourseCategories_UpdatedBy FOREIGN KEY (updated_by) REFERENCES Users(user_id)
);
GO

-- Create index on category_name for faster lookups
CREATE INDEX IDX_CourseCategories_Name ON CourseCategories(category_name);
CREATE INDEX IDX_CourseCategories_Active ON CourseCategories(is_active, display_order);
GO

-- Insert default categories
INSERT INTO CourseCategories (category_name, category_name_en, description, category_icon, category_color, display_order)
VALUES
    (N'เทคโนโลยีสารสนเทศ', 'Information Technology', N'หลักสูตรด้านคอมพิวเตอร์ โปรแกรมมิ่ง และระบบเครือข่าย', 'fa-laptop-code', '#3b82f6', 1),
    (N'การบริหารจัดการ', 'Management', N'หลักสูตรด้านการบริหาร ภาวะผู้นำ และการจัดการทีม', 'fa-users-cog', '#10b981', 2),
    (N'การตลาดและการขาย', 'Marketing & Sales', N'หลักสูตรด้านการตลาด กลยุทธ์การขาย และการสื่อสาร', 'fa-bullhorn', '#f59e0b', 3),
    (N'การเงินและบัญชี', 'Finance & Accounting', N'หลักสูตรด้านการเงิน บัญชี และการวิเคราะห์ทางการเงิน', 'fa-calculator', '#06b6d4', 4),
    (N'ทรัพยากรบุคคล', 'Human Resources', N'หลักสูตรด้าน HR การสรรหา และการพัฒนาบุคลากร', 'fa-user-tie', '#8b5cf6', 5),
    (N'ความปลอดภัยและอาชีวอนามัย', 'Safety & Health', N'หลักสูตรด้านความปลอดภัย อาชีวอนามัย และสิ่งแวดล้อม', 'fa-shield-alt', '#ef4444', 6),
    (N'ทักษะการสื่อสาร', 'Communication Skills', N'หลักสูตรด้านการสื่อสาร การนำเสนอ และภาษา', 'fa-comments', '#ec4899', 7),
    (N'การพัฒนาตนเอง', 'Personal Development', N'หลักสูตรด้านการพัฒนาบุคลิกภาพและทักษะส่วนบุคคล', 'fa-user-graduate', '#14b8a6', 8),
    (N'กฎหมายและระเบียบข้อบังคับ', 'Legal & Compliance', N'หลักสูตรด้านกฎหมาย ระเบียบ และการปฏิบัติตามข้อบังคับ', 'fa-gavel', '#6366f1', 9),
    (N'ทั่วไป', 'General', N'หลักสูตรทั่วไปและหลักสูตรอื่นๆ', 'fa-book', '#64748b', 10);
GO

-- Create trigger to update updated_at timestamp
CREATE TRIGGER trg_CourseCategories_UpdateTimestamp
ON CourseCategories
AFTER UPDATE
AS
BEGIN
    UPDATE CourseCategories
    SET updated_at = GETDATE()
    FROM CourseCategories cc
    INNER JOIN inserted i ON cc.category_id = i.category_id;
END;
GO

PRINT 'CourseCategories table created successfully with default data';
