using System.Net;
using System.Text;
using System.Text.Json;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

/// <summary>
/// Tests covering hold rules:
/// - One active application per student per class (ALREADY_APPLIED)
/// - Confirming another student's hold returns 404
/// - Cancel a HELD hold returns 204
/// - Cannot cancel a CONFIRMED hold (returns 409)
/// - Re-apply after cancel is permitted
/// </summary>
public class HoldRulesTests : IClassFixture<TestWebFactory>
{
    private readonly TestWebFactory _factory;
    private readonly HttpClient _client;

    public HoldRulesTests(TestWebFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

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

    private async Task<(HttpResponseMessage Resp, Guid? HoldId)> ApplyHoldAsync(Guid classId, string studentId)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, $"/classes/{classId}/holds");
        req.Headers.Add("X-Student-Id", studentId);
        var resp = await _client.SendAsync(req);
        if (resp.StatusCode == HttpStatusCode.Created)
        {
            var body = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            return (resp, doc.RootElement.GetProperty("holdId").GetGuid());
        }
        return (resp, null);
    }

    [Fact]
    public async Task OneActivePerStudent_SecondHoldReturns409_AlreadyApplied()
    {
        var classId = await CreateClassAsync("One Active Test", 5);
        const string studentId = "00000000000000021";

        var (firstResp, holdId) = await ApplyHoldAsync(classId, studentId);
        Assert.Equal(HttpStatusCode.Created, firstResp.StatusCode);
        Assert.NotNull(holdId);

        var (secondResp, _) = await ApplyHoldAsync(classId, studentId);
        Assert.Equal(HttpStatusCode.Conflict, secondResp.StatusCode);

        var body = await secondResp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.Equal("ALREADY_APPLIED",
            doc.RootElement.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task ConfirmAnotherStudentHold_Returns404()
    {
        var classId = await CreateClassAsync("Wrong Student Test", 5);
        const string studentA = "00000000000000022";
        const string studentB = "00000000000000023";

        var (_, holdId) = await ApplyHoldAsync(classId, studentA);
        Assert.NotNull(holdId);

        var confirmReq = new HttpRequestMessage(HttpMethod.Post, $"/holds/{holdId}/confirm");
        confirmReq.Headers.Add("X-Student-Id", studentB);
        var confirmResp = await _client.SendAsync(confirmReq);

        Assert.Equal(HttpStatusCode.NotFound, confirmResp.StatusCode);
    }

    [Fact]
    public async Task CancelHeld_Returns204_AndStatusBecomesCancelled()
    {
        var classId = await CreateClassAsync("Cancel Held Test", 5);
        const string studentId = "00000000000000024";

        var (_, holdId) = await ApplyHoldAsync(classId, studentId);
        Assert.NotNull(holdId);

        var cancelReq = new HttpRequestMessage(HttpMethod.Delete, $"/holds/{holdId}");
        cancelReq.Headers.Add("X-Student-Id", studentId);
        var cancelResp = await _client.SendAsync(cancelReq);

        Assert.Equal(HttpStatusCode.NoContent, cancelResp.StatusCode);

        // Verify status is CANCELLED
        var getResp = await _client.GetAsync($"/holds/{holdId}");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        var getBody = await getResp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(getBody);
        Assert.Equal("CANCELLED", doc.RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task CannotCancelConfirmed_Returns409()
    {
        var classId = await CreateClassAsync("Cannot Cancel Confirmed Test", 5);
        const string studentId = "00000000000000025";

        var (_, holdId) = await ApplyHoldAsync(classId, studentId);
        Assert.NotNull(holdId);

        var confirmReq = new HttpRequestMessage(HttpMethod.Post, $"/holds/{holdId}/confirm");
        confirmReq.Headers.Add("X-Student-Id", studentId);
        var confirmResp = await _client.SendAsync(confirmReq);
        Assert.Equal(HttpStatusCode.OK, confirmResp.StatusCode);

        var cancelReq = new HttpRequestMessage(HttpMethod.Delete, $"/holds/{holdId}");
        cancelReq.Headers.Add("X-Student-Id", studentId);
        var cancelResp = await _client.SendAsync(cancelReq);

        Assert.Equal(HttpStatusCode.Conflict, cancelResp.StatusCode);
    }

    [Fact]
    public async Task ReapplyAfterCancel_Succeeds()
    {
        var classId = await CreateClassAsync("Reapply After Cancel Test", 5);
        const string studentId = "00000000000000026";

        var (_, holdId) = await ApplyHoldAsync(classId, studentId);
        Assert.NotNull(holdId);

        var cancelReq = new HttpRequestMessage(HttpMethod.Delete, $"/holds/{holdId}");
        cancelReq.Headers.Add("X-Student-Id", studentId);
        var cancelResp = await _client.SendAsync(cancelReq);
        Assert.Equal(HttpStatusCode.NoContent, cancelResp.StatusCode);

        // Student applies again
        var (secondResp, secondHoldId) = await ApplyHoldAsync(classId, studentId);
        Assert.Equal(HttpStatusCode.Created, secondResp.StatusCode);
        Assert.NotNull(secondHoldId);
        Assert.NotEqual(holdId, secondHoldId);
    }
}
