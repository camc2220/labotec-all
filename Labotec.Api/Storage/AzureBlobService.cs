using Azure.Storage.Blobs;
using Azure.Storage.Sas;
namespace Labotec.Api.Storage;
public class AzureBlobService : IStorageService
{
    private readonly BlobServiceClient _svc;
    private readonly string _container;
    public AzureBlobService(IConfiguration cfg)
    {
        var conn = cfg.GetValue<string>("Storage:Azure:ConnectionString") ?? throw new InvalidOperationException("Storage:Azure:ConnectionString missing");
        _container = cfg.GetValue<string>("Storage:Azure:Container") ?? "labresults";
        _svc = new BlobServiceClient(conn);
    }
    public async Task<string> UploadAsync(string fileName, Stream content, string contentType)
    {
        var container = _svc.GetBlobContainerClient(_container);
        await container.CreateIfNotExistsAsync();
        var blob = container.GetBlobClient(fileName);
        await blob.UploadAsync(content, overwrite: true);
        await blob.SetHttpHeadersAsync(new Azure.Storage.Blobs.Models.BlobHttpHeaders { ContentType = contentType });
        return blob.Uri.ToString();
    }
    public string GetAccessUrl(string fileName, TimeSpan ttl)
    {
        var container = _svc.GetBlobContainerClient(_container);
        var blob = container.GetBlobClient(fileName);
        if (!blob.CanGenerateSasUri) return blob.Uri.ToString();
        var sas = new BlobSasBuilder { BlobContainerName = container.Name, BlobName = fileName, Resource = "b", ExpiresOn = DateTimeOffset.UtcNow.Add(ttl) };
        sas.SetPermissions(BlobSasPermissions.Read);
        return blob.GenerateSasUri(sas).ToString();
    }
}
