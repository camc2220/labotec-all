using System;
using System.Security.Claims;
using Labotec.Api.Auth;

namespace Labotec.Api.Common;

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetPatientId(this ClaimsPrincipal? principal)
    {
        var raw = principal?.FindFirst(AppClaims.PatientId)?.Value;
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
