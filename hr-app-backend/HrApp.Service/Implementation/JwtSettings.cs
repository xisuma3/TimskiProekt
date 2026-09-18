using System.Text;

namespace HrApp.Service.Implementation
{
    public sealed class JwtSettings
    {
        private JwtSettings(string key, string issuer, string audience, int durationInMinutes)
        {
            Key = key;
            Issuer = issuer;
            Audience = audience;
            DurationInMinutes = durationInMinutes;
        }

        public string Key { get; }
        public string Issuer { get; }
        public string Audience { get; }
        public int DurationInMinutes { get; }

        public static JwtSettings Create(string? key, string? issuer, string? audience, string? durationInMinutes)
        {
            if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(audience))
                throw new InvalidOperationException("JWT configuration is incomplete.");
            if (Encoding.UTF8.GetByteCount(key) < 32)
                throw new InvalidOperationException("JWT signing key must be at least 32 bytes.");
            if (!int.TryParse(durationInMinutes, out var duration) || duration <= 0 || duration > 1440)
                throw new InvalidOperationException("JWT duration must be between 1 and 1440 minutes.");
            return new JwtSettings(key, issuer, audience, duration);
        }
    }
}
