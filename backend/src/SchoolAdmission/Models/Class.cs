namespace SchoolAdmission.Models;

public class Class
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public int TotalSeats { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<Hold> Holds { get; set; } = new List<Hold>();
}
