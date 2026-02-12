using BuilderPulsePro.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BuilderPulsePro.Api.Data;

public class AppDbContext : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<Attachment> Attachments => Set<Attachment>();
    public DbSet<JobAttachment> JobAttachments => Set<JobAttachment>();
    public DbSet<Contractor> Contractors => Set<Contractor>();
    public DbSet<ContractorProfile> ContractorProfiles => Set<ContractorProfile>();
    public DbSet<Bid> Bids => Set<Bid>();
    public DbSet<BidLineItem> BidLineItems => Set<BidLineItem>();
    public DbSet<BidVariant> BidVariants => Set<BidVariant>();
    public DbSet<BidVariantLineItem> BidVariantLineItems => Set<BidVariantLineItem>();
    public DbSet<BidRevision> BidRevisions => Set<BidRevision>();
    public DbSet<BidAttachmentParseJob> BidAttachmentParseJobs => Set<BidAttachmentParseJob>();
    public DbSet<BidAttachment> BidAttachments => Set<BidAttachment>();
    public DbSet<ActivityEvent> ActivityEvents => Set<ActivityEvent>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageAttachment> MessageAttachments => Set<MessageAttachment>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<MessageReport> MessageReports => Set<MessageReport>();
    public DbSet<ContractorJobNotification> ContractorJobNotifications => Set<ContractorJobNotification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Contractor>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.DisplayName).HasMaxLength(200).IsRequired();

            // PostGIS geography point
            b.Property(x => x.HomeBase).HasColumnType("geography (point)");
            b.HasIndex(x => x.HomeBase).HasMethod("gist");

            b.Property(x => x.ServiceRadiusMeters).IsRequired();
        });

        modelBuilder.Entity<Job>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Title).HasMaxLength(200).IsRequired();
            b.Property(x => x.Trade).HasMaxLength(100).IsRequired();
            b.Property(x => x.Description).HasMaxLength(4000);
            b.Property(x => x.City).HasMaxLength(200);
            b.Property(x => x.State).HasMaxLength(50);
            b.Property(x => x.Zip).HasMaxLength(20);

            b.Property(x => x.SiteLocation).HasColumnType("geography (point)");
            b.HasIndex(x => x.SiteLocation).HasMethod("gist");

            b.Property(x => x.CreatedAt).IsRequired();

            b.HasIndex(x => x.PostedByUserId);
        });

        modelBuilder.Entity<Attachment>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.FileName).HasMaxLength(255).IsRequired();
            b.Property(x => x.ContentType).HasMaxLength(200).IsRequired();
            b.Property(x => x.StorageProvider).HasMaxLength(50).IsRequired();
            b.Property(x => x.StorageKey).HasMaxLength(500).IsRequired();
            b.Property(x => x.StorageUrl).HasMaxLength(2000);
            b.Property(x => x.Content).HasColumnType("bytea");
            b.Property(x => x.CreatedAt).IsRequired();
        });

        modelBuilder.Entity<JobAttachment>(b =>
        {
            b.HasKey(x => new { x.JobId, x.AttachmentId });
            b.HasIndex(x => x.JobId);
            b.HasIndex(x => x.AttachmentId);

            b.HasOne<Job>()
                .WithMany()
                .HasForeignKey(x => x.JobId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Attachment)
                .WithMany()
                .HasForeignKey(x => x.AttachmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BidAttachment>(b =>
        {
            b.HasKey(x => new { x.BidId, x.AttachmentId });
            b.HasIndex(x => x.BidId);
            b.HasIndex(x => x.AttachmentId);

            b.HasOne<Bid>()
                .WithMany()
                .HasForeignKey(x => x.BidId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Attachment)
                .WithMany()
                .HasForeignKey(x => x.AttachmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Job>()
            .HasIndex(x => x.Status);

        modelBuilder.Entity<Bid>(b =>
        {
            b.HasKey(x => x.Id);

            b.Property(x => x.ContractorProfileId).IsRequired();
            b.Property(x => x.AmountCents).IsRequired();
            b.Property(x => x.Notes).HasMaxLength(4000);
            b.Property(x => x.Terms).HasMaxLength(4000);
            b.Property(x => x.Assumptions).HasMaxLength(4000);
            b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsRequired();

            b.HasIndex(x => x.JobId);

            b.HasIndex(x => x.BidderUserId);

            b.HasIndex(x => x.ContractorProfileId);

            b.HasIndex(x => x.Status);

            // Enforce one bid per user per job
            b.HasIndex(x => new { x.JobId, x.BidderUserId }).IsUnique();

            b.HasOne(x => x.Job)
                .WithMany()
                .HasForeignKey(x => x.JobId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BidLineItem>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Description).HasMaxLength(500).IsRequired();
            b.Property(x => x.Quantity).IsRequired();
            b.Property(x => x.UnitPriceCents).IsRequired();
            b.Property(x => x.SortOrder).IsRequired();

            b.HasIndex(x => x.BidId);
            b.HasIndex(x => new { x.BidId, x.SortOrder });

            b.HasOne(x => x.Bid)
                .WithMany(b => b.LineItems)
                .HasForeignKey(x => x.BidId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BidVariant>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).HasMaxLength(200).IsRequired();
            b.Property(x => x.Notes).HasMaxLength(2000);
            b.Property(x => x.AmountCents).IsRequired();
            b.Property(x => x.SortOrder).IsRequired();

            b.HasIndex(x => x.BidId);
            b.HasIndex(x => new { x.BidId, x.SortOrder });

            b.HasOne(x => x.Bid)
                .WithMany()
                .HasForeignKey(x => x.BidId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BidAttachmentParseJob>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Status).IsRequired();
            b.Property(x => x.CreatedAt).IsRequired();
            b.Property(x => x.UpdatedAt).IsRequired();
            b.Property(x => x.ErrorMessage).HasMaxLength(2000);

            b.HasIndex(x => x.BidId);
            b.HasIndex(x => x.AttachmentId);
            b.HasIndex(x => new { x.BidId, x.AttachmentId });
        });

        modelBuilder.Entity<BidVariantLineItem>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Description).HasMaxLength(500).IsRequired();
            b.Property(x => x.Quantity).IsRequired();
            b.Property(x => x.UnitPriceCents).IsRequired();
            b.Property(x => x.SortOrder).IsRequired();

            b.HasIndex(x => x.BidVariantId);
            b.HasIndex(x => new { x.BidVariantId, x.SortOrder });

            b.HasOne(x => x.BidVariant)
                .WithMany(v => v.LineItems)
                .HasForeignKey(x => x.BidVariantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BidRevision>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.RevisionNumber).IsRequired();
            b.Property(x => x.CreatedByUserId).IsRequired();
            b.Property(x => x.CreatedAt).IsRequired();
            b.Property(x => x.SnapshotJson).IsRequired();

            b.HasIndex(x => x.BidId);
            b.HasIndex(x => new { x.BidId, x.RevisionNumber });

            b.HasOne(x => x.Bid)
                .WithMany()
                .HasForeignKey(x => x.BidId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ContractorProfile>(b =>
        {
            b.HasKey(x => x.UserId);

            b.Property(x => x.DisplayName).HasMaxLength(200).IsRequired();
            b.Property(x => x.City).HasMaxLength(200);
            b.Property(x => x.State).HasMaxLength(50);
            b.Property(x => x.Zip).HasMaxLength(20);
            b.Property(x => x.TradesCsv).HasMaxLength(500).IsRequired();

            b.Property(x => x.HomeBase).HasColumnType("geography (point)");
            b.HasIndex(x => x.HomeBase).HasMethod("gist");

            b.Property(x => x.ServiceRadiusMeters).IsRequired();
            b.Property(x => x.IsAvailable).IsRequired();
            b.Property(x => x.UnavailableReason).HasMaxLength(500);
            b.Property(x => x.LastDigestSentAt);
            b.Property(x => x.UpdatedAt).IsRequired();
        });

        modelBuilder.Entity<ActivityEvent>(b =>
        {
            b.HasKey(x => x.Id);

            b.Property(x => x.Type).HasMaxLength(100).IsRequired();
            b.Property(x => x.PayloadJson).HasMaxLength(4000);
            b.Property(x => x.OccurredAt).IsRequired();

            b.HasIndex(x => x.JobId);
            b.HasIndex(x => x.OccurredAt);
        });

        modelBuilder.Entity<Conversation>(b =>
        {
            b.HasKey(x => x.Id);

            b.Property(x => x.CreatedAt).IsRequired();
            b.HasIndex(x => new { x.JobId, x.ContractorProfileId }).IsUnique();
            b.HasIndex(x => x.ClientUserId);
            b.HasIndex(x => x.ContractorProfileId);
        });

        modelBuilder.Entity<Message>(b =>
        {
            b.HasKey(x => x.Id);

            b.Property(x => x.Body).HasMaxLength(2000).IsRequired();
            b.Property(x => x.CreatedAt).IsRequired();

            b.HasIndex(x => x.ConversationId);
            b.HasIndex(x => x.SenderUserId);
            b.HasIndex(x => x.RecipientUserId);
            b.HasIndex(x => x.ReadAt);
            b.HasIndex(x => x.ClientUserId);
            b.HasIndex(x => x.ContractorProfileId);
        });

        modelBuilder.Entity<MessageAttachment>(b =>
        {
            b.HasKey(x => new { x.MessageId, x.AttachmentId });
            b.HasIndex(x => x.MessageId);
            b.HasIndex(x => x.AttachmentId);

            b.HasOne<Message>()
                .WithMany()
                .HasForeignKey(x => x.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Attachment)
                .WithMany()
                .HasForeignKey(x => x.AttachmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MessageReport>(b =>
        {
            b.HasKey(x => x.Id);

            b.Property(x => x.Reason).HasMaxLength(1000).IsRequired();
            b.Property(x => x.CreatedAt).IsRequired();

            b.HasIndex(x => x.MessageId);
            b.HasIndex(x => x.ReporterUserId);
            b.HasIndex(x => x.ResolvedAt);
        });

        modelBuilder.Entity<Review>(b =>
        {
            b.HasKey(x => x.Id);

            b.Property(x => x.Rating).IsRequired();
            b.Property(x => x.Body).HasMaxLength(2000);
            b.Property(x => x.CreatedAt).IsRequired();

            b.HasIndex(x => x.JobId);
            b.HasIndex(x => x.RevieweeUserId);
            b.HasIndex(x => new { x.JobId, x.ReviewerUserId }).IsUnique();
        });

        modelBuilder.Entity<ContractorJobNotification>(b =>
        {
            b.HasKey(x => x.Id);

            b.HasIndex(x => x.ContractorUserId);
            b.HasIndex(x => x.JobId);
            b.HasIndex(x => new { x.ContractorUserId, x.JobId }).IsUnique();

            b.Property(x => x.CreatedAt).IsRequired();
        });

    }
}
