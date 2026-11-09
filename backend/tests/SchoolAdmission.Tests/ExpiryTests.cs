using System.Net;
using System.Text;
using System.Text.Json;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

/// <summary>
/// Tests that holds expire after HOLD_DURATION_SECONDS and seats are released.
/// Uses ShortHoldTestWebFactory which overrides HOLD_DURATION_SECONDS=1.
/// </summary>
public class ExpiryTests : IClassFixture<ShortHoldTestWebFactory>
{
    private readonly ShortHoldTestWebFactory _factory;
    private readonly HttpClient _client;

    public ExpiryTests(ShortHoldTestWebFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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

    private async Task<Guid> ApplyHoldAsync(Guid classId, string studentId)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, $"/classes/{classId}/holds");
        req.Headers.Add("X-Student-Id", studentId);
        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("holdId").GetGuid();
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HoldExpires_AfterDurationSeconds_AndSeatIsReleased()
    {
        // Arrange
        var classId = await CreateClassAsync("Expiry Class", 1);
        var studentId = "00000000000000001";
        var holdId = await ApplyHoldAsync(classId, studentId);

        // Wait for the hold to expire (HOLD_DURATION_SECONDS=1, wait 2s to be safe)
        await Task.Delay(2000);

        // Assert: GET /holds/{holdId} → status should be EXPIRED
        var holdResp = await _client.GetAsync($"/holds/{holdId}");
        Assert.Equal(HttpStatusCode.OK, holdResp.StatusCode);
        var holdBody = await holdResp.Content.ReadAsStringAsync();
        using var holdDoc = JsonDocument.Parse(holdBody);
        Assert.Equal("EXPIRED", holdDoc.RootElement.GetProperty("status").GetString());

        // Assert: GET /classes/{classId} → availableSeats back to 1
        var classResp = await _client.GetAsync($"/classes/{classId}");
        Assert.Equal(HttpStatusCode.OK, classResp.StatusCode);
        var classBody = await classResp.Content.ReadAsStringAsync();
        using var classDoc = JsonDocument.Parse(classBody);
        Assert.Equal(1, classDoc.RootElement.GetProperty("availableSeats").GetInt32());
    }
}
