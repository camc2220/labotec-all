namespace Labotec.Api.Domain;

public class LabTest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Código corto de la prueba (ej. GLU, CBC, TSH).
    /// </summary>
    public string Code { get; set; } = default!;

    /// <summary>
    /// Nombre descriptivo de la prueba (ej. Glucosa en suero).
    /// </summary>
    public string Name { get; set; } = default!;

    /// <summary>
    /// Unidad típica de reporte (ej. mg/dL, g/dL).
    /// </summary>
    public string? DefaultUnit { get; set; }

    /// <summary>
    /// Precio de referencia de la prueba (opcional).
    /// </summary>
    public decimal? DefaultPrice { get; set; }

    /// <summary>
    /// Valor o rango de referencia esperado para la prueba.
    /// </summary>
    public string? ReferenceValue { get; set; }

    /// <summary>
    /// Permite desactivar pruebas sin borrarlas físicamente.
    /// </summary>
    public bool Active { get; set; } = true;

    public ICollection<LabOrderItem> OrderItems { get; set; } = new List<LabOrderItem>();
}
