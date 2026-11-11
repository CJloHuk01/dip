using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaterFix.API.Data;
using WaterFix.API.Helpers;
using WaterFix.API.Services;

namespace WaterFix.API.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("api/admin/media")]
public class AdminMediaController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FileService _fileService;

    public AdminMediaController(AppDbContext db, FileService fileService)
    {
        _db = db;
        _fileService = fileService;
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var media = await _db.ComplaintMedia.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id);
        if (media is null)
            return NotFound(ApiResponse<object>.Fail("Файл не найден"));

        var path = _fileService.GetMediaPhysicalPath(media.RelativePath);
        if (!System.IO.File.Exists(path))
            return NotFound(ApiResponse<object>.Fail("Файл не найден"));

        var stream = System.IO.File.OpenRead(path);
        return File(stream, media.ContentType, enableRangeProcessing: true);
    }
}
