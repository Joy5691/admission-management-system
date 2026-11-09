namespace SchoolAdmission.Models;

public class Hold
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClassId { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public string Status { get; set; } = "HELD";
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CancelledAt { get; set; }

    public Class Class { get; set; } = null!;
}
