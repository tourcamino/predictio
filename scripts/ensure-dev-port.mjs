/**
 * Vinxi/listhen default host can be IPv6-only (::1) on Windows; browsers often use IPv4 for
 * "localhost" → ERR_CONNECTION_REFUSED. Binding to 127.0.0.1 fixes that unless HOST is already set.
 */
if (process.env.PORT == null || String(process.env.PORT).trim() === "") {
  process.env.PORT = "5173";
}
if (process.env.HOST == null || String(process.env.HOST).trim() === "") {
  process.env.HOST = "127.0.0.1";
}
