using System.Net;
using System.Text;
using System.Text.Json;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

/// <summary>
/// Bonus Test: Two distinct WebApplicationFactory / backend instances sharing
/// the exact same PostgreSQL database instance.
/// Demonstrates that row-level locking (SELECT ... FOR UPDATE) inside PostgreSQL
/// prevents overselling across multiple separate application processes.
/// </summary>
public class MultiProcessConcurrencyTests : IClassFixture<TestWebFactory>
{
    private readonly TestWebFactory _factory1;

    public MultiProcessConcurrencyTests(TestWebFactory factory)
    {
        _factory1 = factory;
    }

    [Fact]
    public async Task TwoBackendInstancesSharingSameDb_NeverOversell_UnderConcurrentTraffic()
    {
        // Instance 1 client
        var client1 = _factory1.CreateClient();

        // Create a second factory instance pointing to the same DB connection string
        using var factory2 = _factory1.WithWebHostBuilder(builder =>
        {
            // Inherits the same PostgreSQL connection string
            builder.UseSetting("HOLD_DURATION_SECONDS", "600");
        });
        var client2 = factory2.CreateClient();

        // Create a class with 10 seats using instance 1
        var createPayload = JsonSerializer.Serialize(new { name = "Multi-Process Concurrency Class", totalSeats = 10 });
        var createResp = await client1.PostAsync("/classes",
            new StringContent(createPayload, Encoding.UTF8, "application/json"));
        createResp.EnsureSuccessStatusCode();
        var createBody = await createResp.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createBody);
        var classId = createDoc.RootElement.GetProperty("id").GetGuid();

        // Fire 100 requests total: 50 hitting instance 1, 50 hitting instance 2 in parallel
        const int totalSeats = 10;
        const int totalRequests = 100;

        var tasks = Enumerable.Range(1, totalRequests).Select(i =>
        {
            var studentId = (1000 + i).ToString("D17");
            // Alternate between instance 1 and instance 2
            var client = (i % 2 == 0) ? _factory1.CreateClient() : factory2.CreateClient();

            return Task.Run(async () =>
            {
                var req = new HttpRequestMessage(HttpMethod.Post, $"/classes/{classId}/holds");
                req.Headers.Add("X-Student-Id", studentId);
                return await client.SendAsync(req);
            });
        }).ToList();

        var responses = await Task.WhenAll(tasks);

        var statusCodes = responses.Select(r => (int)r.StatusCode).ToList();
        var created = statusCodes.Count(s => s == 201);
        var conflict = statusCodes.Count(s => s == 409);

        // Assert: exactly 10 are created, 90 conflict
        Assert.Equal(totalSeats, created);
        Assert.Equal(totalRequests - totalSeats, conflict);

        // Verify with instance 2 that available seats == 0 and held == 10
        var classResp = await client2.GetAsync($"/classes/{classId}");
        Assert.Equal(HttpStatusCode.OK, classResp.StatusCode);
        var classBody = await classResp.Content.ReadAsStringAsync();
        using var classDoc = JsonDocument.Parse(classBody);
        var root = classDoc.RootElement;

        Assert.Equal(0, root.GetProperty("availableSeats").GetInt32());
        Assert.Equal(totalSeats, root.GetProperty("heldSeats").GetInt32());
    }
}
