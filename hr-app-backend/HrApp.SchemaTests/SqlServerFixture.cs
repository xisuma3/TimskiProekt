using HrAppWebApplication;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.SchemaTests
{
    /// <summary>
    /// Builds a throwaway SQL Server database **by running the committed migrations**, so
    /// these tests check what the migrations actually produce rather than what the model
    /// claims.
    ///
    /// This is the half that <c>HrApp.Tests</c> cannot cover: the EF in-memory provider
    /// ignores foreign keys, unique indexes and filters, so the rules that live only in
    /// the schema — Restrict cascades, the filtered email index — would pass there
    /// whatever the database really did.
    ///
    /// Connection string comes from <c>HRAPP_TEST_SQL</c>, falling back to LocalDB for
    /// developer machines. CI supplies a SQL Server service container.
    /// </summary>
    public sealed class SqlServerFixture : IAsyncLifetime
    {
        private readonly string _databaseName = $"HrAppSchemaTests_{Guid.NewGuid():N}";

        public string ConnectionString { get; private set; }

        public static string BaseConnectionString =>
            Environment.GetEnvironmentVariable("HRAPP_TEST_SQL")
            ?? @"Server=(localdb)\MSSQLLocalDB;Trusted_Connection=True;TrustServerCertificate=True;";

        public HrAppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<HrAppDbContext>()
                .UseSqlServer(ConnectionString)
                .Options;
            return new HrAppDbContext(options);
        }

        public async Task InitializeAsync()
        {
            var builder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(BaseConnectionString)
            {
                InitialCatalog = _databaseName
            };
            ConnectionString = builder.ConnectionString;

            await using var context = CreateContext();
            // MigrateAsync, not EnsureCreated: EnsureCreated builds from the model and would
            // hide a migration that does not reproduce it.
            await context.Database.MigrateAsync();
        }

        public async Task DisposeAsync()
        {
            try
            {
                await using var context = CreateContext();
                await context.Database.EnsureDeletedAsync();
            }
            catch
            {
                // A leftover test database is not worth failing the run over.
            }
        }
    }

    [CollectionDefinition("SqlServer")]
    public class SqlServerCollection : ICollectionFixture<SqlServerFixture>
    {
        // Marker: creating the database once per run rather than per test class.
    }
}
