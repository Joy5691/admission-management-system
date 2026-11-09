using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using SchoolAdmission.Models;

namespace SchoolAdmission.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Class> Classes => Set<Class>();
    public DbSet<Hold> Holds => Set<Hold>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // --- classes table ---
        modelBuilder.Entity<Class>(e =>
        {
            e.ToTable("classes");
            e.HasKey(c => c.Id);
            e.Property(c => c.Id).HasColumnName("id");
            e.Property(c => c.Name).HasColumnName("name").IsRequired();
            e.Property(c => c.TotalSeats).HasColumnName("total_seats");
            e.Property(c => c.CreatedAt).HasColumnName("created_at")
                .HasDefaultValueSql("now()");
        });

        // --- holds table ---
        modelBuilder.Entity<Hold>(e =>
        {
            e.ToTable("holds");
            e.HasKey(h => h.Id);
            e.Property(h => h.Id).HasColumnName("id");
            e.Property(h => h.ClassId).HasColumnName("class_id");
            e.Property(h => h.StudentId).HasColumnName("student_id")
                .HasMaxLength(17);
            e.Property(h => h.Status).HasColumnName("status").IsRequired();
            e.Property(h => h.CreatedAt).HasColumnName("created_at")
                .HasDefaultValueSql("now()");
            e.Property(h => h.ExpiresAt).HasColumnName("expires_at");
            e.Property(h => h.ConfirmedAt).HasColumnName("confirmed_at");
            e.Property(h => h.CancelledAt).HasColumnName("cancelled_at");

            e.HasOne(h => h.Class)
                .WithMany(c => c.Holds)
                .HasForeignKey(h => h.ClassId);
        });
    }

    /// <summary>
    /// Run raw SQL to create schema if not exists. Called on startup instead of EF migrations.
    /// </summary>
    public async Task EnsureSchemaAsync()
    {
        await Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS classes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  total_seats  int NOT NULL CHECK (total_seats > 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      uuid NOT NULL REFERENCES classes(id),
  student_id    varchar(17) NOT NULL,
  status        text NOT NULL CHECK (status IN ('HELD','CONFIRMED','EXPIRED','CANCELLED')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  confirmed_at  timestamptz NULL,
  cancelled_at  timestamptz NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_hold_per_student_class
  ON holds (class_id, student_id)
  WHERE status IN ('HELD','CONFIRMED');

CREATE INDEX IF NOT EXISTS ix_holds_class_status ON holds (class_id, status, expires_at);
CREATE INDEX IF NOT EXISTS ix_holds_student ON holds (student_id);
");
    }
}
