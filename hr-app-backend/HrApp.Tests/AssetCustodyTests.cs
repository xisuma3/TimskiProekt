using HrApp.DomainEntities.DTO.Request;
using System;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    public class AssetCustodyTests
    {
        [Fact]
        public async Task Assigning_OpensACustodyRecord()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee("Ada", "Lovelace");
            var asset = h.AddAsset();

            await h.AssetService.AssignAsync(asset.AssetID, new AssignAssetRequestDto
            {
                EmployeeID = employee.EmployeeID,
                Notes = "New starter"
            });

            var history = (await h.AssetService.GetHistoryAsync(asset.AssetID)).ToList();
            Assert.Single(history);
            Assert.Equal("Ada Lovelace", history[0].EmployeeName);
            Assert.True(history[0].IsOpen);

            var stored = await h.AssetService.GetByIdAsync(asset.AssetID);
            Assert.Equal(employee.EmployeeID, stored.EmployeeID);
            Assert.True(stored.IsAssigned);
        }

        [Fact]
        public async Task Reassigning_ClosesThePreviousHoldersPeriod()
        {
            // Reassignment used to overwrite Asset.EmployeeID, losing the previous holder
            // entirely.
            using var h = new TestHarness();
            var first = h.AddEmployee("Ada", "Lovelace");
            var second = h.AddEmployee("Grace", "Hopper");
            var asset = h.AddAsset();

            await h.AssetService.AssignAsync(asset.AssetID, new AssignAssetRequestDto
            {
                EmployeeID = first.EmployeeID,
                AssignedDate = new DateTime(2030, 1, 1)
            });
            await h.AssetService.AssignAsync(asset.AssetID, new AssignAssetRequestDto
            {
                EmployeeID = second.EmployeeID,
                AssignedDate = new DateTime(2030, 6, 1)
            });

            var history = (await h.AssetService.GetHistoryAsync(asset.AssetID)).ToList();
            Assert.Equal(2, history.Count);

            var current = history.Single(a => a.IsOpen);
            var previous = history.Single(a => !a.IsOpen);

            Assert.Equal("Grace Hopper", current.EmployeeName);
            Assert.Equal("Ada Lovelace", previous.EmployeeName);
            Assert.Equal(new DateTime(2030, 6, 1), previous.ReturnedDate);
            Assert.Equal(151, previous.DaysHeld);
        }

        [Fact]
        public async Task AssigningToTheCurrentHolder_Throws()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var asset = h.AddAsset();

            var dto = new AssignAssetRequestDto { EmployeeID = employee.EmployeeID };
            await h.AssetService.AssignAsync(asset.AssetID, dto);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.AssetService.AssignAsync(asset.AssetID, dto));
        }

        [Fact]
        public async Task BackdatingAHandoverBeforeTheCurrentPeriod_IsRejected()
        {
            using var h = new TestHarness();
            var first = h.AddEmployee("Ada", "Lovelace");
            var second = h.AddEmployee("Grace", "Hopper");
            var asset = h.AddAsset();

            await h.AssetService.AssignAsync(asset.AssetID, new AssignAssetRequestDto
            {
                EmployeeID = first.EmployeeID,
                AssignedDate = new DateTime(2030, 6, 1)
            });

            await Assert.ThrowsAsync<ArgumentException>(() =>
                h.AssetService.AssignAsync(asset.AssetID, new AssignAssetRequestDto
                {
                    EmployeeID = second.EmployeeID,
                    AssignedDate = new DateTime(2030, 1, 1)
                }));
        }

        [Fact]
        public async Task Returning_PutsTheAssetBackInStock()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var asset = h.AddAsset();

            await h.AssetService.AssignAsync(asset.AssetID, new AssignAssetRequestDto
            {
                EmployeeID = employee.EmployeeID,
                AssignedDate = new DateTime(2030, 1, 1)
            });
            await h.AssetService.ReturnAsync(asset.AssetID, new ReturnAssetRequestDto
            {
                ReturnedDate = new DateTime(2030, 3, 1),
                ReturnCondition = "Good"
            });

            var stored = await h.AssetService.GetByIdAsync(asset.AssetID);
            Assert.Null(stored.EmployeeID);
            Assert.False(stored.IsAssigned);

            var history = (await h.AssetService.GetHistoryAsync(asset.AssetID)).ToList();
            Assert.Single(history);
            Assert.False(history[0].IsOpen);
            Assert.Equal("Good", history[0].ReturnCondition);
        }

        [Fact]
        public async Task ReturningAnAssetNobodyHolds_Throws()
        {
            using var h = new TestHarness();
            var asset = h.AddAsset();

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.AssetService.ReturnAsync(asset.AssetID, new ReturnAssetRequestDto()));
        }

        [Fact]
        public async Task ReturnDateBeforeAssignment_IsRejected()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var asset = h.AddAsset();

            await h.AssetService.AssignAsync(asset.AssetID, new AssignAssetRequestDto
            {
                EmployeeID = employee.EmployeeID,
                AssignedDate = new DateTime(2030, 6, 1)
            });

            await Assert.ThrowsAsync<ArgumentException>(() =>
                h.AssetService.ReturnAsync(asset.AssetID, new ReturnAssetRequestDto
                {
                    ReturnedDate = new DateTime(2030, 1, 1)
                }));
        }

        [Fact]
        public async Task DuplicateSerialNumber_IsRejectedWithAUsableMessage()
        {
            // Previously this surfaced as a DbUpdateException, i.e. an HTTP 500.
            using var h = new TestHarness();
            h.AddAsset(name: "Laptop A", serial: "SN-DUPLICATE");

            var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
                h.AssetService.CreateAsync(new AssetRequestDto
                {
                    Name = "Laptop B",
                    SerialNumber = "SN-DUPLICATE",
                    IsActive = true
                }));

            Assert.Contains("already registered", ex.Message);
        }

        [Fact]
        public async Task CreatingAnAssetWithAHolder_OpensCustodyImmediately()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee("Ada", "Lovelace");

            var created = await h.AssetService.CreateAsync(new AssetRequestDto
            {
                Name = "Phone",
                SerialNumber = "SN-PHONE",
                EmployeeID = employee.EmployeeID,
                IsActive = true
            });

            var history = (await h.AssetService.GetHistoryAsync(created.AssetID)).ToList();
            Assert.Single(history);
            Assert.Equal("Ada Lovelace", history[0].EmployeeName);
            Assert.True(history[0].IsOpen);
        }

        [Fact]
        public async Task AnEmployeesHistory_IncludesReturnedItems()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var laptop = h.AddAsset(name: "Laptop", serial: "SN-L");
            var phone = h.AddAsset(name: "Phone", serial: "SN-P");

            await h.AssetService.AssignAsync(laptop.AssetID, new AssignAssetRequestDto { EmployeeID = employee.EmployeeID });
            await h.AssetService.AssignAsync(phone.AssetID, new AssignAssetRequestDto { EmployeeID = employee.EmployeeID });
            await h.AssetService.ReturnAsync(laptop.AssetID, new ReturnAssetRequestDto());

            var history = (await h.AssetService.GetEmployeeHistoryAsync(employee.EmployeeID)).ToList();

            Assert.Equal(2, history.Count);
            Assert.Contains(history, a => a.AssetName == "Laptop" && !a.IsOpen);
            Assert.Contains(history, a => a.AssetName == "Phone" && a.IsOpen);
        }
    }
}
