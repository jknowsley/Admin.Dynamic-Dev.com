IF OBJECT_ID(N'[dbo].[ProviderUsageSnapshots]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[ProviderUsageSnapshots];
END

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
    [SnapshotAtUtc] DATETIME2 NOT NULL,
    [RangeKey] NVARCHAR(20) NOT NULL,
    [RangeStartUtc] DATETIME2 NOT NULL,
    [RangeEndUtc] DATETIME2 NOT NULL
);

CREATE INDEX [IX_ProviderUsageSnapshots_Provider_RangeKey] ON [dbo].[ProviderUsageSnapshots]([Provider], [RangeKey]);
CREATE INDEX [IX_ProviderUsageSnapshots_RangeStartUtc_RangeEndUtc] ON [dbo].[ProviderUsageSnapshots]([RangeStartUtc], [RangeEndUtc]);
