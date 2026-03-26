using Admin.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace Admin.Server.Data;

public class AdminDbContext : DbContext
{
    public AdminDbContext(DbContextOptions<AdminDbContext> options) : base(options) { }
    
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Project>(entity =>
        {
            entity.ToTable("Projects");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.DiscordChannelId).HasMaxLength(50);
            entity.HasIndex(e => e.Name).IsUnique();
        });
        
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.ToTable("Conversations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Summary).HasMaxLength(2000);
            entity.HasIndex(e => new { e.ProjectId, e.Date }).IsUnique();
            entity.HasIndex(e => e.Date);
            
            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.ToTable("Tasks");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.Priority).HasMaxLength(20);
            entity.Property(e => e.AssignedTo).HasMaxLength(50);
            entity.Property(e => e.BranchName).HasMaxLength(200);
            entity.Property(e => e.CommitHash).HasMaxLength(100);
            entity.Property(e => e.PRUrl).HasMaxLength(500);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
