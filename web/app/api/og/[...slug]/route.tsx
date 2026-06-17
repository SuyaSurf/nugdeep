import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET(request: Request) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title") ?? "Bammby Games";
  const subtitle = url.searchParams.get("subtitle") ?? "Play quick 1v1 games and connect";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #020617 0%, #4c0519 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "80px",
          width: "100%",
        }}
      >
        <div style={{ color: "#fb7185", fontSize: 28, letterSpacing: 8, marginBottom: 28 }}>
          BAMMBY GAMES
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, textAlign: "center" }}>
          {title}
        </div>
        <div style={{ color: "#cbd5e1", fontSize: 34, marginTop: 30, textAlign: "center" }}>
          {subtitle}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
