IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProviderUsageSnapshots]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ProviderUsageSnapshots]
    (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Provider] NVARCHAR(50) NOT NULL,
        [DisplayName] NVARCHAR(50) NOT NULL,
        [Status] NVARCHAR(50) NOT NULL,
        [IsHealthy] BIT NOT NULL,
        [Requests] INT NOT NULL,
        [Errors] INT NOT NULL,
        [InputTokens] BIGINT NOT NULL,
        [OutputTokens] BIGINT NOT NULL,
        [CacheReadTokens] BIGINT NOT NULL,
        [CacheWriteTokens] BIGINT NOT NULL,
        [TotalTokens] BIGINT NOT NULL,
        [TotalCost] DECIMAL(18,6) NOT NULL,
        [LastUsed] NVARCHAR(100) NULL,
        [LastError] NVARCHAR(2000) NULL,
        [ModelsJson] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_ProviderUsageSnapshots_ModelsJson] DEFAULT N'[]',
        [SnapshotAtUtc] DATETIME2 NOT NULL CONSTRAINT [DF_ProviderUsageSnapshots_SnapshotAtUtc] DEFAULT SYSUTCDATETIME()
    );

    CREATE UNIQUE INDEX [IX_ProviderUsageSnapshots_Provider] ON [dbo].[ProviderUsageSnapshots]([Provider]);
    CREATE INDEX [IX_ProviderUsageSnapshots_SnapshotAtUtc] ON [dbo].[ProviderUsageSnapshots]([SnapshotAtUtc]);
END
