using HrApp.Service.Implementation;
using System;
using Xunit;

namespace HrApp.Tests
{
    public class JwtSettingsTests
    {
        private const string SafeKey = "01234567890123456789012345678901";

        [Fact]
        public void ValidConfiguration_ProvidesIssuerAudienceAndLifetime()
        {
            var settings = JwtSettings.Create(SafeKey, "issuer", "audience", "60");

            Assert.Equal("issuer", settings.Issuer);
            Assert.Equal("audience", settings.Audience);
            Assert.Equal(60, settings.DurationInMinutes);
        }

        [Theory]
        [InlineData(null, "issuer", "audience", "60")]
        [InlineData("short", "issuer", "audience", "60")]
        [InlineData(SafeKey, null, "audience", "60")]
        [InlineData(SafeKey, "issuer", null, "60")]
        [InlineData(SafeKey, "issuer", "audience", "0")]
        [InlineData(SafeKey, "issuer", "audience", "invalid")]
        public void MissingOrUnsafeConfiguration_IsRejected(string key, string issuer, string audience, string duration)
        {
            Assert.Throws<InvalidOperationException>(() => JwtSettings.Create(key, issuer, audience, duration));
        }
    }
}
