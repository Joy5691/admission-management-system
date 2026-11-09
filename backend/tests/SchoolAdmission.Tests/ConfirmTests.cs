using System.Net;
using System.Text;
using System.Text.Json;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

/// <summary>
/// Tests for confirm idempotency and confirm-after-expiry scenarios.
/// </summary>
public class ConfirmTests : IClassFixture<TestWebFactory>
{
    private readonly TestWebFactory _factory;
    private readonly HttpClient _client;

    public ConfirmTests(TestWebFactory factory)
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

    private async Task<HttpResponseMessage> ConfirmHoldAsync(Guid holdId, string studentId)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, $"/holds/{holdId}/confirm");
        req.Headers.Add("X-Student-Id", studentId);
        return await _client.SendAsync(req);
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task IdempotentConfirm_SecondConfirmReturns200_AndSeatCountedOnce()
    {
        // Arrange
        var classId = await CreateClassAsync("Confirm Idempotency Class", 5);
        const string studentId = "00000000000000011";
        var holdId = await ApplyHoldAsync(classId, studentId);

        // Act: confirm twice
        var first = await ConfirmHoldAsync(holdId, studentId);
        var second = await ConfirmHoldAsync(holdId, studentId);

        // Assert: both return 200
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        var firstBody = await first.Content.ReadAsStringAsync();
        var secondBody = await second.Content.ReadAsStringAsync();

        using var firstDoc = JsonDocument.Parse(firstBody);
        using var secondDoc = JsonDocument.Parse(secondBody);
        Assert.Equal("CONFIRMED", firstDoc.RootElement.GetProperty("status").GetString());
        Assert.Equal("CONFIRMED", secondDoc.RootElement.GetProperty("status").GetString());

        // Assert: confirmedSeats == 1 (not 2)
        var classResp = await _client.GetAsync($"/classes/{classId}");
        Assert.Equal(HttpStatusCode.OK, classResp.StatusCode);
        var classBody = await classResp.Content.ReadAsStringAsync();
        using var classDoc = JsonDocument.Parse(classBody);
        Assert.Equal(1, classDoc.RootElement.GetProperty("confirmedSeats").GetInt32());
    }

    [Fact]
    public async Task ConfirmAfterExpiry_Returns409_HoldExpired()
    {
        // This test needs short expiry — use a dedicated factory/client with HOLD_DURATION_SECONDS=1
        await using var shortFactory = new ShortHoldTestWebFactory();
        await shortFactory.InitializeAsync();
        var shortClient = shortFactory.CreateClient();

        // Create class and apply hold
        var payload = JsonSerializer.Serialize(new { name = "Confirm Expiry Class", totalSeats = 1 });
        var createResp = await shortClient.PostAsync(
            "/classes",
            new StringContent(payload, Encoding.UTF8, "application/json"));
        createResp.EnsureSuccessStatusCode();
        var createBody = await createResp.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createBody);
        var classId = createDoc.RootElement.GetProperty("id").GetGuid();

        const string studentId = "00000000000000012";
        var holdReq = new HttpRequestMessage(HttpMethod.Post, $"/classes/{classId}/holds");
        holdReq.Headers.Add("X-Student-Id", studentId);
        var holdResp = await shortClient.SendAsync(holdReq);
        Assert.Equal(HttpStatusCode.Created, holdResp.StatusCode);
        var holdBody = await holdResp.Content.ReadAsStringAsync();
        using var holdDoc = JsonDocument.Parse(holdBody);
        var holdId = holdDoc.RootElement.GetProperty("holdId").GetGuid();

        // Wait for hold to expire
        await Task.Delay(2000);

        // Try to confirm
        var confirmReq = new HttpRequestMessage(HttpMethod.Post, $"/holds/{holdId}/confirm");
        confirmReq.Headers.Add("X-Student-Id", studentId);
        var confirmResp = await shortClient.SendAsync(confirmReq);

        // Assert: 409 HOLD_EXPIRED
        Assert.Equal(HttpStatusCode.Conflict, confirmResp.StatusCode);
        var confirmBody = await confirmResp.Content.ReadAsStringAsync();
        using var confirmRespDoc = JsonDocument.Parse(confirmBody);
        Assert.Equal("HOLD_EXPIRED",
            confirmRespDoc.RootElement.GetProperty("error").GetProperty("code").GetString());
    }
}
