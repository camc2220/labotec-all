namespace Labotec.Api.Auth
{
    public static class AppClaims
    {
        // IMPORTANTE: Esto debe coincidir exactamente con lo que hay en tu columna ClaimType de la base de datos MySQL.
        // En tus datos mostraste que es "patientId" (minúscula).
        public const string PatientId = "patientId";
    }
}