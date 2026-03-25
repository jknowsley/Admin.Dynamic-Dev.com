-- Admin.Dynamic-Dev.com Initial Schema
-- Run against: Dynamicdev database on Dynamicdev.database.windows.net

-- =============================================
-- Projects Table
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Projects]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Projects] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [Name] NVARCHAR(100) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [DiscordChannelId] NVARCHAR(50) NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NULL,
        CONSTRAINT [PK_Projects] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
    
    CREATE UNIQUE INDEX [IX_Projects_Name] ON [dbo].[Projects] ([Name]);
END
GO

-- =============================================
-- Conversations Table
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Conversations]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Conversations] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [ProjectId] INT NOT NULL,
        [Date] DATE NOT NULL,
        [Content] NVARCHAR(MAX) NOT NULL,
        [Summary] NVARCHAR(2000) NULL,
        [MessageCount] INT NOT NULL DEFAULT 0,
        [TokenCount] INT NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NULL,
        CONSTRAINT [PK_Conversations] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Conversations_Projects] FOREIGN KEY ([ProjectId]) REFERENCES [dbo].[Projects] ([Id]) ON DELETE CASCADE
    );
    
    CREATE UNIQUE INDEX [IX_Conversations_ProjectId_Date] ON [dbo].[Conversations] ([ProjectId], [Date]);
    CREATE INDEX [IX_Conversations_Date] ON [dbo].[Conversations] ([Date]);
END
GO

-- =============================================
-- Tasks Table (Future Expansion)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Tasks]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Tasks] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [ProjectId] INT NULL,
        [Title] NVARCHAR(200) NOT NULL,
        [Description] NVARCHAR(MAX) NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT 'Open',
        [Priority] NVARCHAR(20) NOT NULL DEFAULT 'Medium',
        [DueDate] DATE NULL,
        [CompletedAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NULL,
        CONSTRAINT [PK_Tasks] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Tasks_Projects] FOREIGN KEY ([ProjectId]) REFERENCES [dbo].[Projects] ([Id]) ON DELETE SET NULL
    );
    
    CREATE INDEX [IX_Tasks_ProjectId] ON [dbo].[Tasks] ([ProjectId]);
    CREATE INDEX [IX_Tasks_Status] ON [dbo].[Tasks] ([Status]);
END
GO

-- =============================================
-- CodeSnippets Table (Future Expansion)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CodeSnippets]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CodeSnippets] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [ProjectId] INT NULL,
        [Title] NVARCHAR(200) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [Language] NVARCHAR(50) NOT NULL,
        [Code] NVARCHAR(MAX) NOT NULL,
        [Tags] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NULL,
        CONSTRAINT [PK_CodeSnippets] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_CodeSnippets_Projects] FOREIGN KEY ([ProjectId]) REFERENCES [dbo].[Projects] ([Id]) ON DELETE SET NULL
    );
    
    CREATE INDEX [IX_CodeSnippets_ProjectId] ON [dbo].[CodeSnippets] ([ProjectId]);
    CREATE INDEX [IX_CodeSnippets_Language] ON [dbo].[CodeSnippets] ([Language]);
END
GO

-- =============================================
-- Decisions Table (Future Expansion)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Decisions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Decisions] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [ProjectId] INT NULL,
        [Title] NVARCHAR(200) NOT NULL,
        [Description] NVARCHAR(MAX) NULL,
        [Rationale] NVARCHAR(MAX) NULL,
        [DecisionDate] DATE NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NULL,
        CONSTRAINT [PK_Decisions] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Decisions_Projects] FOREIGN KEY ([ProjectId]) REFERENCES [dbo].[Projects] ([Id]) ON DELETE SET NULL
    );
    
    CREATE INDEX [IX_Decisions_ProjectId] ON [dbo].[Decisions] ([ProjectId]);
    CREATE INDEX [IX_Decisions_DecisionDate] ON [dbo].[Decisions] ([DecisionDate]);
END
GO

-- =============================================
-- ImportLogs Table (Track sync operations)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ImportLogs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ImportLogs] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [StartedAt] DATETIME2 NOT NULL,
        [CompletedAt] DATETIME2 NULL,
        [Status] NVARCHAR(50) NOT NULL,
        [ConversationsImported] INT NOT NULL DEFAULT 0,
        [ErrorMessage] NVARCHAR(MAX) NULL,
        CONSTRAINT [PK_ImportLogs] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO

-- =============================================
-- Seed Initial Projects
-- =============================================
IF NOT EXISTS (SELECT * FROM [dbo].[Projects] WHERE [Name] = 'General')
BEGIN
    INSERT INTO [dbo].[Projects] ([Name], [Description], [DiscordChannelId])
    VALUES 
        ('General', 'General conversations and miscellaneous topics', '1476196683032563824'),
        ('MINTED-CORE', 'MINTED-CORE Blazor application development', '1476208136061718660'),
        ('MINTED', 'Legacy MINTED .NET Framework application', '1476208105036714054'),
        ('Burkson', 'Burkson TDG B2B RideStyler project', NULL),
        ('Logenix', 'Logenix-Core logistics application', NULL),
        ('Aegis', 'Aegis FactoryLogix MOS system', NULL),
        ('Corning', 'Corning application development', NULL);
END
GO

-- =============================================
-- Full-Text Search Setup (for best search performance)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'AdminSearchCatalog')
BEGIN
    CREATE FULLTEXT CATALOG AdminSearchCatalog AS DEFAULT;
END
GO

-- Full-text index on Conversations
IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('dbo.Conversations'))
BEGIN
    CREATE FULLTEXT INDEX ON [dbo].[Conversations] ([Content], [Summary])
    KEY INDEX [PK_Conversations] ON AdminSearchCatalog
    WITH CHANGE_TRACKING AUTO;
END
GO

-- Full-text index on CodeSnippets
IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('dbo.CodeSnippets'))
BEGIN
    CREATE FULLTEXT INDEX ON [dbo].[CodeSnippets] ([Title], [Description], [Code], [Tags])
    KEY INDEX [PK_CodeSnippets] ON AdminSearchCatalog
    WITH CHANGE_TRACKING AUTO;
END
GO

-- Full-text index on Decisions
IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('dbo.Decisions'))
BEGIN
    CREATE FULLTEXT INDEX ON [dbo].[Decisions] ([Title], [Description], [Rationale])
    KEY INDEX [PK_Decisions] ON AdminSearchCatalog
    WITH CHANGE_TRACKING AUTO;
END
GO

PRINT 'Admin.Dynamic-Dev.com schema created successfully!';
