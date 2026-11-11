using System.Security.Cryptography;

namespace WaterFix.API.Helpers;

public static class PublicCodeGenerator
{
    // Без похожих символов 0/O, 1/I/L
    private const string Alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    public const int DefaultLength = 8;

    public static string Generate(int length = DefaultLength)
    {
        var chars = new char[length];
        for (var i = 0; i < length; i++)
        {
            chars[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        }
        return new string(chars);
    }
}
