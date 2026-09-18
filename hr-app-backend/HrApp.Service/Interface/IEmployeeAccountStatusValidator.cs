namespace HrApp.Service.Interface
{
    public interface IEmployeeAccountStatusValidator
    {
        Task<bool> CanAuthenticateAsync(string? applicationUserId);
    }
}
