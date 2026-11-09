using System.Net;
using System.Text;
using System.Text.Json;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

/// <summary>
/// Fires 100 parallel hold requests against a class with 10 seats.
/// Verifies exactly 10 succeed (201) and exactly 90 fail (409).
/// </summary>
public class ConcurrencyTests : IClassFixture<TestWebFactory>
{
    private readonly TestWebFactory _factory;
    private readonly HttpClient _client;

    public ConcurrencyTests(TestWebFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // ── Helper: create a class ────────────────────────────────────────────────

    private async Task<Guid> CreateClassAsync(string name, int seats)
    {
        var payload = JsonSerializer.Serialize(new { name, totalSeats = seats });
        var resp = await _client.PostAsync(
            "/classes",
            new StringContent(payload, Encoding.UTF8, "application/json"));

        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("id").GetGuid();
    }

    [Fact]
    public async Task Exactly10Of100ParallelHoldsSucceed_ForClassWith10Seats()
    {
        // Arrange
        const int totalSeats = 10;
        const int parallelRequests = 100;
        var classId = await CreateClassAsync("Concurrency Class", totalSeats);

        // Build 100 tasks — each with a unique 17-digit student ID
        var tasks = Enumerable.Range(1, parallelRequests).Select(i =>
        {
            var studentId = i.ToString("D17"); // e.g. "00000000000000001"
            return Task.Run(async () =>
            {
                // Each task creates its own client to avoid HttpClient concurrency issues
                using var client = _factory.CreateClient();
                var req = new HttpRequestMessage(
                    HttpMethod.Post,
                    $"/classes/{classId}/holds");
                req.Headers.Add("X-Student-Id", studentId);
                return await client.SendAsync(req);
            });
        }).ToList();

        // Act — fire all in parallel
        var responses = await Task.WhenAll(tasks);

        // Assert status code distribution
        var statusCodes = responses.Select(r => (int)r.StatusCode).ToList();
        var created = statusCodes.Count(s => s == 201);
        var conflict = statusCodes.Count(s => s == 409);

        Assert.Equal(totalSeats, created);
        Assert.Equal(parallelRequests - totalSeats, conflict);

        // Assert class state
        var classResp = await _client.GetAsync($"/classes/{classId}");
        Assert.Equal(HttpStatusCode.OK, classResp.StatusCode);
        var classBody = await classResp.Content.ReadAsStringAsync();
        using var classDoc = JsonDocument.Parse(classBody);
        var root = classDoc.RootElement;

        Assert.Equal(0, root.GetProperty("availableSeats").GetInt32());
        Assert.Equal(totalSeats, root.GetProperty("heldSeats").GetInt32());
    }
}
