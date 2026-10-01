using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    /// <summary>
    /// Instants (when something happened) must reach the browser with a UTC offset, or it
    /// reads them as local time and every "2h ago" is wrong by the user's offset. Calendar
    /// dates must NOT carry one, or a browser west of UTC shows the previous day.
    /// </summary>
    public class UtcInstantTests
    {
        // What ASP.NET Core uses for the API's JSON.
        private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

        private static async Task<LeaveRequestResponseDto> ReloadedDecidedRequest(TestHarness h)
        {
            var employee = h.AddEmployee("Ada", "Lovelace");
            var approver = h.AddEmployee("Grace", "Hopper");
            h.AddEntitlement(employee.EmployeeID, 2030, "Vacation", 20);
            var created = await h.LeaveRequestService.CreateAsync(new LeaveRequestRequestDto
            {
                EmployeeID = employee.EmployeeID,
                StartDate = new DateTime(2030, 6, 10),
                EndDate = new DateTime(2030, 6, 12),
                LeaveType = "Vacation",
            });
            await h.LeaveRequestService.ApproveRequestAsync(created.RequestID, approver.EmployeeID, "ok");

            // Force a real read from the store rather than the tracked instance.
            h.Context.ChangeTracker.Clear();
            return await h.LeaveRequestService.GetByIdAsync(created.RequestID);
        }

        [Fact]
        public async Task Instants_ComeBackAsUtc_AndSerialiseWithZ()
        {
            using var h = new TestHarness();
            var dto = await ReloadedDecidedRequest(h);

            Assert.Equal(DateTimeKind.Utc, dto.CreatedAt.Kind);
            Assert.Equal(DateTimeKind.Utc, dto.DecisionAt.Value.Kind);

            var json = JsonSerializer.Serialize(dto, Web);
            using var doc = JsonDocument.Parse(json);
            Assert.EndsWith("Z", doc.RootElement.GetProperty("createdAt").GetString());
            Assert.EndsWith("Z", doc.RootElement.GetProperty("decisionAt").GetString());
        }

        [Fact]
        public async Task CalendarDates_StayOffsetFree()
        {
            using var h = new TestHarness();
            var dto = await ReloadedDecidedRequest(h);

            var json = JsonSerializer.Serialize(dto, Web);
            using var doc = JsonDocument.Parse(json);
            Assert.Equal("2030-06-10T00:00:00", doc.RootElement.GetProperty("startDate").GetString());
            Assert.Equal("2030-06-12T00:00:00", doc.RootElement.GetProperty("endDate").GetString());
        }

        [Fact]
        public async Task ALocalTime_IsStoredAsUtc()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var request = h.AddLeaveRequest(employee.EmployeeID, new DateTime(2030, 6, 10), new DateTime(2030, 6, 10));

            var local = new DateTime(2030, 6, 1, 12, 0, 0, DateTimeKind.Local);
            var entity = await h.Context.LeaveRequests.SingleAsync(r => r.RequestID == request.RequestID);
            entity.DecisionAt = local;
            await h.Context.SaveChangesAsync();

            h.Context.ChangeTracker.Clear();
            var reloaded = await h.Context.LeaveRequests.SingleAsync(r => r.RequestID == request.RequestID);
            Assert.Equal(DateTimeKind.Utc, reloaded.DecisionAt.Value.Kind);
            Assert.Equal(local.ToUniversalTime(), reloaded.DecisionAt.Value);
        }

        [Fact]
        public async Task OtherInstants_AreMarkedUtcToo()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee("Ada", "Lovelace");
            var template = h.AddTemplate("<p>{{employee.firstName}}</p>");
            await h.GeneratedDocumentService.GenerateDocumentAsync(new GeneratedDocumentRequestDto
            {
                EmployeeID = employee.EmployeeID,
                TemplateID = template.TemplateID,
            });
            await h.EmployeeService.DeleteAsync(employee.EmployeeID);
            await h.EraseAsync(employee.EmployeeID);

            h.Context.ChangeTracker.Clear();
            Assert.Equal(DateTimeKind.Utc, (await h.Context.GeneratedDocuments.SingleAsync()).GeneratedDate.Kind);
            var stored = await h.Context.Employees.SingleAsync(e => e.EmployeeID == employee.EmployeeID);
            Assert.Equal(DateTimeKind.Utc, stored.DeletedAt.Value.Kind);
            Assert.Equal(DateTimeKind.Utc, stored.ErasedAt.Value.Kind);
            Assert.Equal(DateTimeKind.Utc, (await h.EmployeeService.GetErasureLogAsync()).Single().PerformedAt.Kind);
            // A calendar date on the same row is untouched.
            Assert.Equal(DateTimeKind.Unspecified, stored.HireDate.Kind);
        }
    }
}
